/**
 * 系统托盘管理模块
 * 负责托盘图标创建、菜单更新、事件处理
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { Menu, Tray, nativeImage } = require('electron')
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ============ 路径配置 ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')   // 项目根目录（tray/ 的上两级）
const iconPath = path.join(rootDir, 'assets', 'LocalLLM.ico')
const trayIconPath = path.join(rootDir, 'assets', 'LocalLLM-tray.png')

// ============ 托盘状态 ============
let tray = null

/**
 * 获取托盘实例
 */
export function getTray() {
  return tray
}

/**
 * 设置托盘实例
 */
export function setTray(value) {
  tray = value
}

/**
 * 获取状态标签文本
 * @param runtimeStatus - 运行时状态对象
 * @returns 状态文本
 */
export function statusLabel(runtimeStatus) {
  return {
    stopped: '未启动',
    starting: '启动中',
    running: '运行中',
    stopping: '停止中',
    error: '需要处理',
  }[runtimeStatus.state] || runtimeStatus.state
}

/**
 * 更新系统托盘菜单
 * @param runtimeStatus - 运行时状态对象
 * @param serverChild - 服务器进程实例
 * @param showMainWindow - 显示主窗口函数
 * @param shell - Electron shell 模块
 * @param setStatus - 设置状态函数
 * @param taskkill - 终止进程函数
 * @param setAppQuitting - 设置应用退出状态函数
 * @param app - Electron app 模块
 */
export function updateTrayMenu(
  runtimeStatus,
  serverChild,
  showMainWindow,
  shell,
  setStatus,
  taskkill,
  setAppQuitting,
  app
) {
  if (!tray) {
    return
  }

  tray.setToolTip(`本语 · LocalLLM Studio - ${statusLabel(runtimeStatus)} - ${runtimeStatus.url}`)
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '打开 本语 · LocalLLM Studio',
      click: showMainWindow,
    },
    {
      label: `${statusLabel(runtimeStatus)}  ${runtimeStatus.url}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '打开 OpenAI Base URL',
      click: () => shell.openExternal(`${runtimeStatus.url}/v1`),
    },
    {
      label: '停止服务',
      enabled: Boolean(serverChild && serverChild.exitCode === null),
      click: async () => {
        if (serverChild && serverChild.exitCode === null) {
          setStatus({ state: 'stopping', message: '正在停止服务' })
          await taskkill(serverChild.pid)
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出并停止服务',
      click: () => {
        setAppQuitting(true)
        app.quit()
      },
    },
  ]))
}

/**
 * 创建系统托盘
 * @param showMainWindow - 显示主窗口函数
 * @param runtimeStatus - 运行时状态对象
 * @param serverChild - 服务器进程实例
 * @param shell - Electron shell 模块
 * @param setStatus - 设置状态函数
 * @param taskkill - 终止进程函数
 * @param setAppQuitting - 设置应用退出状态函数
 * @param app - Electron app 模块
 * @returns 系统托盘实例
 */
export function createTray(
  showMainWindow,
  runtimeStatus,
  serverChild,
  shell,
  setStatus,
  taskkill,
  setAppQuitting,
  app
) {
  if (tray) {
    return tray
  }

  const image = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(image.isEmpty() ? nativeImage.createFromPath(iconPath) : image)
  tray.on('click', showMainWindow)
  tray.on('double-click', showMainWindow)
  
  updateTrayMenu(runtimeStatus, serverChild, showMainWindow, shell, setStatus, taskkill, setAppQuitting, app)
  
  return tray
}
