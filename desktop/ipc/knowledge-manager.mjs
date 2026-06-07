/**
 * illama Desktop - 知识库管理 IPC 处理
 * 文档上传、列表、删除、TF-IDF 检索
 */

import path from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'

/**
 * 注册知识库相关的 IPC 处理程序
 * @param {import('electron').IpcMain} ipcMain - Electron IPC 主进程实例
 * @param {string} rootDir - 项目根目录路径
 * @param {Function} addLog - 日志函数 (source, chunk) => void
 */
export function registerKnowledgeHandlers(ipcMain, rootDir, addLog) {
  const knowledgeDir = path.join(rootDir, 'data', 'knowledge')
  const knowledgeDocsDir = path.join(knowledgeDir, 'documents')
  const knowledgeIndexFile = path.join(knowledgeDir, 'index.json')

  // 确保知识库目录存在
  if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true })
  }
  if (!existsSync(knowledgeDocsDir)) {
    mkdirSync(knowledgeDocsDir, { recursive: true })
  }
  // 确保 index.json 存在
  if (!existsSync(knowledgeIndexFile)) {
    writeFileSync(knowledgeIndexFile, JSON.stringify({ documents: [], chunks: [], lastUpdated: null }, null, 2))
  }

  // 读取知识库索引
  function loadKnowledgeIndex() {
    try {
      const data = readFileSync(knowledgeIndexFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return { documents: [], chunks: [], lastUpdated: null }
    }
  }

  // 保存知识库索引
  function saveKnowledgeIndex(index) {
    index.lastUpdated = Date.now()
    writeFileSync(knowledgeIndexFile, JSON.stringify(index, null, 2))
  }

  /**
   * 获取文档列表
   */
  ipcMain.handle('llama:list-documents', async () => {
    try {
      const index = loadKnowledgeIndex()
      return { documents: index.documents }
    } catch (error) {
      return { documents: [], error: error instanceof Error ? error.message : String(error) }
    }
  })

  /**
   * 上传文档
   */
  ipcMain.handle('llama:upload-document', async (event, filePath) => {
    try {
      if (!existsSync(filePath)) {
        return { ok: false, error: '文件不存在' }
      }

      const fileName = path.basename(filePath)
      const ext = path.extname(fileName).toLowerCase()

      // 支持的文件格式
      const supportedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md']
      if (!supportedExts.includes(ext)) {
        return { ok: false, error: `不支持的文件格式: ${ext}，支持的格式: ${supportedExts.join(', ')}` }
      }

      const index = loadKnowledgeIndex()
      const docId = `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const destPath = path.join(knowledgeDocsDir, `${docId}${ext}`)

      // 创建文档记录
      const document = {
        id: docId,
        name: fileName,
        path: destPath,
        size: 0,
        uploadedAt: Date.now(),
        status: 'processing', // 开始处理
      }

      // 复制文件到知识库目录
      await fs.copyFile(filePath, destPath)
      const stats = await fs.stat(destPath)
      document.size = stats.size

      // 更新索引（先保存文档记录）
      index.documents.push(document)
      saveKnowledgeIndex(index)

      // 异步解析和分块
      ;(async () => {
        try {
          console.log('[知识库] 开始解析文档:', docId, fileName)

          // 导入解析和分块工具
          const { extractText } = await import('../utils/documentParser.mjs')
          const { chunkText } = await import('../utils/textChunker.mjs')

          // 1. 提取文本
          console.log('[知识库] 正在提取文本...')
          const text = await extractText(destPath)
          console.log('[知识库] 文本提取完成，长度:', text?.length || 0)

          if (!text || text.trim().length === 0) {
            throw new Error('文档内容为空')
          }

          // 2. 分块
          console.log('[知识库] 正在分块...')
          const chunks = chunkText(text, {
            chunkSize: 500,
            overlap: 50,
            maxChunks: 100,
          })

          if (chunks.length === 0) {
            throw new Error('无法分块')
          }

          // 3. 保存 chunks
          const chunkObjects = chunks.map((chunk, idx) => ({
            id: `chunk-${docId}-${idx}`,
            documentId: docId,
            documentName: fileName,
            content: chunk.content,
            index: chunk.index,
          }))

          index.chunks.push(...chunkObjects)

          // 4. 更新文档状态
          const docIdx = index.documents.findIndex(d => d.id === docId)
          if (docIdx !== -1) {
            index.documents[docIdx].status = 'ready'
            index.documents[docIdx].chunkCount = chunkObjects.length
          }

          saveKnowledgeIndex(index)
          console.log('[知识库] 文档解析完成:', docId, 'chunks:', chunkObjects.length)
        } catch (error) {
          console.error('[知识库] 文档解析失败:', error)
          // 更新文档状态为错误
          const docIdx = index.documents.findIndex(d => d.id === docId)
          if (docIdx !== -1) {
            index.documents[docIdx].status = 'error'
            index.documents[docIdx].errorMessage = error instanceof Error ? error.message : String(error)
          }
          saveKnowledgeIndex(index)
        }
      })()

      return { ok: true, document }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  /**
   * 删除文档
   */
  ipcMain.handle('llama:delete-document', async (event, docId) => {
    try {
      const index = loadKnowledgeIndex()
      const docIndex = index.documents.findIndex(d => d.id === docId)

      if (docIndex === -1) {
        return { ok: false, error: '文档不存在' }
      }

      const doc = index.documents[docIndex]

      // 删除文件
      if (existsSync(doc.path)) {
        await fs.unlink(doc.path)
      }

      // 删除相关的 chunks
      index.chunks = index.chunks.filter(c => c.documentId !== docId)

      // 删除文档记录
      index.documents.splice(docIndex, 1)
      saveKnowledgeIndex(index)

      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  /**
   * 搜索知识库
   */
  ipcMain.handle('llama:search-knowledge', async (event, query, opts = {}) => {
    try {
      const { topK = 3 } = opts
      const index = loadKnowledgeIndex()

      // 只搜索状态为 ready 的文档的 chunks
      const readyDocIds = new Set(
        index.documents.filter(d => d.status === 'ready').map(d => d.id)
      )
      const readyChunks = index.chunks.filter(c => readyDocIds.has(c.documentId))

      if (readyChunks.length === 0) {
        return { results: [], error: '没有可用的文档' }
      }

      // 导入 TF-IDF 检索引擎
      const { searchWithTFIDF } = await import('../utils/tfidf.mjs')

      // 执行检索
      const results = searchWithTFIDF(query, readyChunks, { topK })

      return { results }
    } catch (error) {
      return { results: [], error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 记录已注册的日志
  if (addLog) {
    addLog('desktop', `[知识库] 已初始化：${knowledgeDir}`)
  }
}