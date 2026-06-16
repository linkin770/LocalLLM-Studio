/**
 * 窗口管理模块
 * 负责主窗口的创建、显示、隐藏、生命周期管理
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { app, BrowserWindow, Menu } = require('electron')
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ============ 路径配置 ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')   // 项目根目录（core/ 的上两级）
const preloadPath = path.join(__dirname, '..', 'preload.cjs')
const rendererPath = path.join(rootDir, 'renderer', 'index.html')
const iconPath = path.join(rootDir, 'assets', 'LocalLLM.ico')

// ============ 窗口状态 ============
let mainWindow = null
let tray = null
let appIsQuitting = false
let firstHideNoticeShown = false

/**
 * 获取主窗口实例
 */
export function getMainWindow() {
  return mainWindow
}

/**
 * 获取应用退出状态
 */
export function isAppQuitting() {
  return appIsQuitting
}

/**
 * 设置应用退出状态
 */
export function setAppQuitting(value) {
  appIsQuitting = value
}

/**
 * 获取首次隐藏通知状态
 */
export function isFirstHideNoticeShown() {
  return firstHideNoticeShown
}

/**
 * 设置首次隐藏通知状态
 */
export function setFirstHideNoticeShown(value) {
  firstHideNoticeShown = value
}

/**
 * 显示主窗口
 */
export function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(tray)
    return
  }
  mainWindow.setSkipTaskbar(false)
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.show()
  mainWindow.focus()
}

/**
 * 创建主窗口
 * @param trayInstance - 系统托盘实例（用于显示首次隐藏通知）
 */
export function createMainWindow(trayInstance) {
  if (trayInstance) {
    tray = trayInstance
  }
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: '本语 · LocalLLM Studio',
    backgroundColor: '#ffffff',
    icon: iconPath,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  mainWindow.loadFile(rendererPath)
  
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 关闭窗口时最小化到托盘
  mainWindow.on('close', event => {
    if (appIsQuitting) {
      return
    }

    event.preventDefault()
    mainWindow.hide()
    mainWindow.setSkipTaskbar(true)
    if (!firstHideNoticeShown) {
      firstHideNoticeShown = true
      tray?.displayBalloon?.({
        title: '本语 仍在运行',
        content: '窗口已隐藏到系统托盘，本地服务会继续监听。',
      })
    }
  })
  
  // 禁用默认菜单
  Menu.setApplicationMenu(null)
  
  // 注册 DevTools 快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })
}

/**
 * 注册窗口控制相关的 IPC 处理器
 * @param ipcMain - Electron ipcMain 实例
 */
export function registerWindowIpc(ipcMain) {
  /**
   * 退出应用
   */
  ipcMain.handle('llama:quit', async () => {
    appIsQuitting = true
    app.quit()
    return { ok: true }
  })

  /**
   * 关闭窗口
   */
  ipcMain.on('llama:window-close', () => {
    mainWindow?.close()
  })

  /**
   * 最小化窗口
   */
  ipcMain.on('llama:window-minimize', () => {
    mainWindow?.minimize()
  })

  /**
   * 最大化/还原窗口
   */
  ipcMain.on('llama:window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  /**
   * 检查窗口是否最大化
   */
  ipcMain.handle('llama:window-is-maximized', async () => {
    return mainWindow?.isMaximized() || false
  })
}

/**
 * 应用就绪后的初始化
 * @param createTrayCallback - 创建托盘的回调函数（返回 tray 实例）
 * @param registerIpcCallback - 注册 IPC 的回调函数
 * @param addLog - 日志函数
 */
export async function onAppReady(createTrayCallback, registerIpcCallback, addLog) {
  const tray = createTrayCallback()
  createMainWindow(tray)
  registerIpcCallback()
  addLog('desktop', 'illama Desktop 启动')
}

/**
 * 应用退出前的清理
 * @param getServerChild - 获取服务器进程的函数
 * @param setStoppingServer - 设置停止服务器标志的函数
 * @param setStatus - 设置状态函数
 * @param taskkill - 终止进程函数
 */
export async function onAppBeforeQuit(getServerChild, setStoppingServer, setStatus, taskkill) {
  appIsQuitting = true
  const serverChild = getServerChild()
  if (serverChild && serverChild.exitCode === null) {
    setStoppingServer(true)
    setStatus({ state: 'stopping', message: '正在停止服务' })
    await taskkill(serverChild.pid)
  }
}
