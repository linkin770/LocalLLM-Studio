/**
 * illama Desktop - 模型扫描 IPC 处理
 * 扫描 models 目录下的 .gguf 模型文件，并自动匹配 mmproj 投影文件
 */

import path from 'node:path'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

/**
 * 注册模型扫描相关的 IPC 处理程序
 * @param {import('electron').IpcMain} ipcMain - Electron IPC 主进程实例
 * @param {string} rootDir - 项目根目录路径
 */
export function registerModelScannerHandlers(ipcMain, rootDir) {
  ipcMain.handle('llama:scan-models', async () => {
    const modelsDir = path.join(rootDir, 'models')

    // 检查 models 文件夹是否存在
    if (!existsSync(modelsDir)) {
      return { error: '未找到 models 文件夹', models: [] }
    }

    try {
      const files = await readdir(modelsDir)
      const ggufFiles = files.filter(f => f.toLowerCase().endsWith('.gguf'))

      // 分离主模型和 mmproj 文件
      const mainModels = []
      const mmprojMap = new Map() // key: 主模型的基础名, value: mmproj 路径

      for (const file of ggufFiles) {
        const fullPath = path.join(modelsDir, file)
        const lowerName = file.toLowerCase()

        if (lowerName.includes('mmproj')) {
          // 这是投影文件，尝试提取对应的主模型基础名
          let baseKey = file.replace(/\.gguf$/i, '').toLowerCase()
          // 去掉常见的 mmproj 前缀/后缀
          baseKey = baseKey.replace(/^mmproj-/, '').replace(/-mmproj$/, '')
          // 去掉量化级别（如 -f16, -f32, -bf16, -q4_k_m, -q5_k_m 等）
          baseKey = baseKey.replace(/-(f16|f32|bf16|q[0-9][_a-z0-9]*)$/i, '')
          mmprojMap.set(baseKey, fullPath)
        } else {
          // 主模型文件
          let baseName = file.replace(/\.gguf$/i, '')
          // 去掉量化级别（如 -q4_k_m, -q5_k_m, -f16, -bf16 等）
          baseName = baseName.replace(/-(f16|f32|bf16|q[0-9][_a-z0-9]*)$/i, '')
          mainModels.push({
            name: file,
            path: fullPath,
            baseKey: baseName.toLowerCase(),
          })
        }
      }

      // 构建最终模型列表，自动匹配 mmproj
      const models = mainModels.map(model => {
        const mmprojPath = mmprojMap.get(model.baseKey) || null
        const hasVision = !!mmprojPath // 有投影文件则认为支持视觉
        return {
          name: model.name,
          path: model.path,
          mmprojPath,
          hasVision,
        }
      })

      return { models, error: null }
    } catch (error) {
      return {
        error: `扫描失败: ${error instanceof Error ? error.message : String(error)}`,
        models: []
      }
    }
  })
}