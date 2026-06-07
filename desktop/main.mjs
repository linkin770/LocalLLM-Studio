/**
 * illama Desktop - Electron 主进程入口文件
 * 负责应用生命周期、IPC 协调、各模块的整合
 *
 * 目录结构：
 * - core/        核心模块（app-state, config-manager, window-manager）
 * - ipc/         IPC 处理器（chat, file-dialog, knowledge, model-scanner, server, skill）
 * - tray/        系统托盘
 * - utils/       工具/参数（file-utils, model-utils, server-args, ...）
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { app, ipcMain, shell } = require('electron')
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, saveConfig, validation } from './core/config-manager.mjs'
import { buildLaunchDetails } from './utils/server-args.mjs'
import { getMainWindow, showMainWindow, registerWindowIpc, setAppQuitting, onAppReady as windowOnAppReady, onAppBeforeQuit as windowOnAppBeforeQuit } from './core/window-manager.mjs'
import { createTray as createTrayManager, updateTrayMenu as updateTrayMenuManager } from './tray/tray-manager.mjs'
import { addLog, setStatus, getStatus, getLogs, onStatusChange, onLogChange, appState } from './core/app-state.mjs'
import { registerFileDialogHandlers } from './ipc/file-dialog.mjs'
import { registerModelScannerHandlers } from './ipc/model-scanner.mjs'
import { registerKnowledgeHandlers } from './ipc/knowledge-manager.mjs'
import { registerSkillHandlers } from './ipc/skill-manager.mjs'
import { registerChatHandlers } from './ipc/chat-handler.mjs'
import { registerServerHandlers, getServerChild, setStoppingServer, taskkill } from './ipc/server-manager.mjs'

// ============ 路径配置 ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')           // 项目根目录
const preloadPath = path.join(__dirname, 'preload.cjs') // Preload 脚本路径
const rendererPath = path.join(rootDir, 'renderer', 'index.html') // 渲染进程 HTML
const iconPath = path.join(rootDir, 'assets', 'llama-cpp.ico')   // 应用图标

// ============ 事件发送 ============

/**
 * 向渲染进程发送事件
 * @param {object} payload - 事件负载
 */
function sendEvent(payload) {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) {
    return
  }
  win.webContents.send('llama:event', payload)
}

/**
 * 同步托盘菜单
 */
function syncTrayMenu() {
  updateTrayMenuManager(getStatus(), getServerChild(), showMainWindow, shell, setStatus, taskkill, setAppQuitting, app)
}

// ============ 注册 app-state 订阅者 ============
onStatusChange((status) => {
  sendEvent({ type: 'status', status })
  syncTrayMenu()
})

onLogChange((allLogs, newEntries) => {
  sendEvent({ type: 'logs', logs: allLogs })
  // 检测服务启动状态（依赖 serverChild，无法在 app-state.mjs 中处理）
  const serverChild = getServerChild()
  for (const entry of newEntries) {
    if (entry.line.includes('server is listening')) {
      setStatus({ state: 'running', message: '服务正在监听', pid: serverChild?.pid || null })
    }
    if (entry.line.toLowerCase().includes('error')) {
      setStatus({ message: entry.line })
    }
  }
})

// ============ IPC 注册 ============

/**
 * 注册所有 IPC 处理器
 */
function registerIpc() {
  /**
   * 获取应用状态
   */
  ipcMain.handle('llama:get-state', async () => appState({ validation, buildLaunchDetails }))

  /**
   * 保存配置
   */
  ipcMain.handle('llama:save-config', async (_event, payload) => {
    const config = await saveConfig(payload.config, getStatus())
    addLog('desktop', `配置已保存：${config.config_path}`)
    return {
      config,
      validation: validation(config),
      status: getStatus(),
      logs: getLogs(),
      launch: buildLaunchDetails(config),
    }
  })

  // 注册服务器管理 IPC
  registerServerHandlers()

  // 注册聊天 IPC
  registerChatHandlers(ipcMain)

  // 注册文件对话框 IPC
  registerFileDialogHandlers(ipcMain)

  // 注册窗口控制 IPC
  registerWindowIpc(ipcMain)

  // 注册技能管理 IPC
  registerSkillHandlers(ipcMain, rootDir, addLog, getStatus(), loadConfig)

  // 注册模型扫描 IPC
  registerModelScannerHandlers(ipcMain, rootDir)

  // 注册知识库 IPC
  registerKnowledgeHandlers(ipcMain, rootDir, addLog)
}

// ============ 应用启动与生命周期 ============

/**
 * 应用就绪后初始化
 */
async function onAppReady() {
  await windowOnAppReady(
    () => createTrayManager(showMainWindow, getStatus(), getServerChild(), shell, setStatus, taskkill, setAppQuitting, app),
    registerIpc,
    addLog
  )
}

/**
 * 应用退出前清理
 */
async function onAppBeforeQuit() {
  await windowOnAppBeforeQuit(
    getServerChild,
    setStoppingServer,
    setStatus,
    taskkill
  )
}

// 注册应用生命周期事件
app.on('ready', onAppReady)
app.on('before-quit', onAppBeforeQuit)

// 防止多实例运行
if (!app.requestSingleInstanceLock()) {
  app.quit()
}
