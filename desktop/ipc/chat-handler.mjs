/**
 * illama Desktop - 聊天处理 IPC
 * 非流式聊天、流式聊天、中断流式聊天
 */

import path from 'node:path'
import { normalizeConfig, toNumber, localUrl } from '../core/config-manager.mjs'
import { addLog } from '../core/app-state.mjs'
import { getMainWindow } from '../core/window-manager.mjs'

// 模块级状态：聊天流中断控制器
let chatAbortController = null
let currentStreamRequestId = ''

/**
 * 构造请求超时信号（聊天专用）
 * @param {object} config
 * @returns {AbortSignal}
 */
function requestTimeoutSignal(config) {
  const timeoutSec = Number(config?.timeout || 600)
  if (!Number.isFinite(timeoutSec) || timeoutSec <= 0) {
    return AbortSignal.timeout(600 * 1000)
  }
  return AbortSignal.timeout(timeoutSec * 1000)
}

/**
 * 构建发送给 LLM 的 messages 数组（处理文本附件、图片附件、文件引用）
 * @param {Array} messages - 前端传入的原始消息
 * @param {object} config - 归一化后的 config
 * @returns {Array} 可发送给 LLM 的 messages
 */
function buildChatMessages(messages, config) {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(message => message && (message.role === 'user' || message.role === 'assistant' || message.role === 'system'))
    .map(message => {
      const text = String(message.content || '')
      const attachments = Array.isArray(message.attachments) ? message.attachments : []
      const ctxSize = Number(config.ctx_size) || 32768
      const maxContentLen = Math.max(0, Math.round((ctxSize - 8192) * 3.5))

      // 文本附件
      const textBlocks = attachments
        .filter(item => item.kind === 'text')
        .map(item => {
          const itemText = item.text || ''
          if (!itemText) {
            const reason = item.error ? `文件内容无法提取（${item.error}）` : '文件内容为空'
            return `\n\n--- 附件：${item.name} ---\n${reason}`
          }
          const truncated = itemText.length > maxContentLen
            ? itemText.slice(0, maxContentLen) + `\n\n[...文本过长已截断：原文约${Math.round(itemText.length / 500)}词，当前仅读取前${Math.round(maxContentLen / 500)}词（ctx_size=${ctxSize}）。如需分析剩余内容，可分段提问。]`
            : itemText
          return `\n\n--- 附件：${item.name} ---\n${truncated}`
        })

      // 其他文件附件（非文本/图片/PDF）
      const fileBlocks = attachments
        .filter(item => item.kind !== 'text' && item.kind !== 'image' && item.kind !== 'pdf')
        .map(item => {
          const note = item.error ? `解析失败：${item.error}` : item.warning ? `提示：${item.warning}` : ''
          return `\n\n[附件：${item.name}，${item.mime || 'file'}${note ? `，${note}` : ''}]`
        })

      const imageAttachments = attachments.filter(item => item.kind === 'image' && item.dataUrl)

      // 图片消息使用多模态格式
      if (imageAttachments.length > 0) {
        return {
          role: message.role,
          content: [
            {
              type: 'text',
              text: `${text}${textBlocks.join('')}${fileBlocks.join('')}`.trim() || '请分析这些图片。',
            },
            ...imageAttachments.map(item => ({
              type: 'image_url',
              image_url: { url: item.dataUrl },
            })),
          ],
        }
      }

      return {
        role: message.role,
        content: `${text}${textBlocks.join('')}${fileBlocks.join('')}`,
      }
    })
    .filter(message => !message.localOnly)
    .filter(message => Array.isArray(message.content) || String(message.content || '').trim())
}

/**
 * 解析 chat_template_kwargs 字符串
 * @param {string} raw
 * @returns {object|null}
 */
function parseChatTemplateKwargs(raw) {
  if (!raw || typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * 从流式 SSE payload 中提取文本内容
 * @param {object} data
 * @returns {string}
 */
function contentFromStreamPayload(data) {
  if (!data || typeof data !== 'object') return ''
  if (data.error) {
    const message = data.error?.message || data.error || 'unknown error'
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0]
    if (choice?.delta && typeof choice.delta.content === 'string') {
      return choice.delta.content
    }
    if (choice?.message && typeof choice.message.content === 'string') {
      return choice.message.content
    }
    if (typeof choice?.text === 'string') {
      return choice.text
    }
  }
  if (typeof data.content === 'string') return data.content
  if (typeof data.delta === 'string') return data.delta
  return ''
}

/**
 * 注册聊天相关的 IPC 处理程序
 */
export function registerChatHandlers(ipcMain) {
  /**
   * 向渲染进程发送事件
   */
  function sendEvent(payload) {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return
    }
    win.webContents.send('llama:event', payload)
  }

  /**
   * 非流式聊天补全
   */
  ipcMain.handle('llama:chat-completion', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const url = `${localUrl(config)}/v1/chat/completions`
    const messages = buildChatMessages(payload.messages, config)

    if (messages.length === 0) {
      throw new Error('没有可发送的消息')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: path.basename(config.model || 'local-model'),
        messages,
        temperature: toNumber(config.temp, 0.8),
        top_p: toNumber(config.top_p, 0.95),
        max_tokens: config.n_predict === -1 ? undefined : toNumber(config.n_predict, undefined),
        chat_template_kwargs: parseChatTemplateKwargs(config.chat_template_kwargs) || undefined,
        stream: false,
      }),
      signal: requestTimeoutSignal(config),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`模型接口返回 ${response.status}${text ? `：${text.slice(0, 500)}` : ''}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || data?.content || ''
    return {
      ok: true,
      content: String(content || ''),
      raw: data,
    }
  })

  /**
   * 流式聊天补全
   */
  ipcMain.handle('llama:chat-stream', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const requestId = payload.requestId || `${Date.now()}`
    currentStreamRequestId = requestId
    const url = `${localUrl(config)}/v1/chat/completions`
    const startedAt = Date.now()

    // 创建/更新 AbortController，使其可被 abort-chat handler 中断
    chatAbortController = new AbortController()

    let accumulatedContent = ''
    const messages = buildChatMessages(payload.messages, config)

    if (messages.length === 0) {
      chatAbortController = null
      throw new Error('没有可发送的消息')
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: path.basename(config.model || 'local-model'),
          messages,
          temperature: toNumber(config.temp, 0.8),
          top_p: toNumber(config.top_p, 0.95),
          max_tokens: config.n_predict === -1 ? undefined : toNumber(config.n_predict, undefined),
          chat_template_kwargs: parseChatTemplateKwargs(config.chat_template_kwargs) || undefined,
          stream: true,
        }),
        // 注意：AbortSignal.any() 用于组合多个信号（超时 + 用户中断）
        signal: AbortSignal.any([requestTimeoutSignal(config), chatAbortController.signal]),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`模型接口返回 ${response.status}${text ? `：${text.slice(0, 500)}` : ''}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      let buffer = ''
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE 格式
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const dataText = line.slice(6).trim()
          if (!dataText) continue
          if (dataText === '[DONE]') {
            sendEvent({ type: 'chat-stream-done', requestId, done: true, content: accumulatedContent })
            return { ok: true, done: true, content: accumulatedContent }
          }

          try {
            const data = JSON.parse(dataText)
            const content = contentFromStreamPayload(data)
            if (content) {
              accumulatedContent += content
              sendEvent({ type: 'chat-stream', requestId, delta: content })
            }
          } catch {
            // 忽略解析错误的行
          }
        }
      }

      sendEvent({ type: 'chat-stream-done', requestId, done: true, content: accumulatedContent })
      addLog('desktop', `[chat] 流式完成 requestId=${requestId} 长度=${accumulatedContent.length} 耗时=${Date.now() - startedAt}ms`)
      return { ok: true, done: true, content: accumulatedContent }
    } finally {
      chatAbortController = null
      currentStreamRequestId = ''
    }
  })

  /**
   * 中断流式聊天
   */
  ipcMain.handle('llama:abort-chat', async () => {
    if (chatAbortController) {
      chatAbortController.abort()
      chatAbortController = null
      addLog('desktop', `[chat] 流式已中断 requestId=${currentStreamRequestId}`)
    }
    return { ok: true }
  })
}