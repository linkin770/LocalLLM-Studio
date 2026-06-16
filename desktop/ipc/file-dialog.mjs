/**
 * illama Desktop - 文件对话框 IPC 处理
 * 注册文件选择、附件上传、模型/配置选择等对话框相关的 IPC handler
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { dialog } = require('electron')
import { getMainWindow } from '../core/window-manager.mjs'
import { buildAttachment } from '../utils/file-utils.mjs'

/**
 * 注册所有文件对话框相关的 IPC 处理程序
 * @param {import('electron').IpcMain} ipcMain - Electron IPC 主进程实例
 */
export function registerFileDialogHandlers(ipcMain) {
  /**
   * 选择文件（用于上传附件）
   */
  ipcMain.handle('llama:select-files', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
        { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'docx', 'doc', 'xlsx', 'xls'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'toml', 'yaml', 'yml', 'csv'] },
      ],
    })

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true, paths: [] }
    }

    const attachments = await Promise.all(
      result.filePaths.map(filePath => buildAttachment(filePath))
    )

    return { canceled: false, paths: result.filePaths, attachments }
  })

  /**
   * 选择附件（按类型过滤）
   */
  ipcMain.handle('llama:pick-attachments', async (_event, payload) => {
    const kind = payload?.kind || 'file';
    const filters = kind === 'image'
      ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'] }]
      : kind === 'text'
      ? [{ name: '支持的文件', extensions: ['txt', 'md', 'json', 'toml', 'yaml', 'yml', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'docx', 'doc', 'xlsx', 'xls', 'xlsb', 'pdf'] }]
      : [{ name: '所有文件', extensions: ['*'] }];

    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters,
    });

    if (result.canceled || !result.filePaths.length) {
      return [];
    }

    const attachments = await Promise.all(
      result.filePaths.map(filePath => buildAttachment(filePath))
    );

    return attachments;
  })

  /**
   * 选择模型文件
   */
  ipcMain.handle('llama:select-model', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'GGUF Models', extensions: ['gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 选择配置文件
   */
  ipcMain.handle('llama:select-config', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'TOML Files', extensions: ['toml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 选择目录
   */
  ipcMain.handle('llama:select-directory', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openDirectory'],
    })

    return {
      canceled: result.canceled,
      path: result.filePaths?.[0] || '',
    }
  })

  /**
   * 选择文件（通用文件选择器）
   */
  ipcMain.handle('llama:pick-file', async (_event, options) => {
    const dlg = options?.properties
      ? { properties: options.properties }
      : { properties: ['openFile'], filters: options?.filters || [] };
    const r = await dialog.showOpenDialog(getMainWindow(), dlg);
    if (r.canceled || !r.filePaths.length) return null;
    return r.filePaths[0];
  })
}