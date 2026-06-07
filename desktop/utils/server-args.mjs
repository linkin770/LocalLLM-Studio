/**
 * illama Desktop - 服务器启动参数与启动详情构建
 * 负责构造 llama-server.exe 命令行参数、启动预览命令等
 */

import path from 'node:path'
import { hasValue, splitExtraArgs } from '../core/config-manager.mjs'

// ============ 工具函数 ============

/**
 * 条件性添加命令行参数
 * @param {string[]} args - 参数数组
 * @param {string} flag - 参数标志
 * @param {string|number} value - 参数值
 */
export function pushArg(args, flag, value) {
  if (hasValue(value)) {
    args.push(flag, String(value))
  }
}

/**
 * 为命令行参数添加引号（如果包含空格）
 * @param {string} value - 参数值
 * @returns {string} 带引号的参数
 */
export function quoteCommandPart(value) {
  const text = String(value || '')
  if (!text) {
    return '""'
  }
  return /[\s"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text
}

/**
 * 移除字符串两端的引号
 * @param {string} text - 输入文本
 * @returns {string} 移除引号后的文本
 */
export function stripWrappingQuotes(text) {
  const value = String(text || '').trim()
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).trim()
    }
  }
  return value
}

/**
 * 规范化 Chat Template Kwargs 文本（处理用户输入可能带引号或前缀的情况）
 * @param {string} raw - 原始文本
 * @returns {string} 规范化后的 JSON 字符串
 */
export function normalizeChatTemplateKwargsText(raw) {
  let text = stripWrappingQuotes(raw)
  if (!text) {
    return ''
  }
  text = text.replace(/^--chat-template-kwargs\s+/i, '').trim()
  text = stripWrappingQuotes(text)
  if (text.includes('\\"')) {
    text = text.replace(/\\"/g, '"')
  }
  return text
}

// ============ 主要函数 ============

/**
 * 构建 llama-server 命令行参数
 * @param {object} config - 配置对象
 * @returns {string[]} 参数数组
 */
export function buildServerArgs(config) {
  const args = []
  pushArg(args, '--model', config.model)
  pushArg(args, '--mmproj', config.mmproj)
  pushArg(args, '--host', config.host)
  pushArg(args, '--port', config.port)
  pushArg(args, '--ctx-size', config.ctx_size)
  pushArg(args, '--n-predict', config.n_predict)
  pushArg(args, '--n-gpu-layers', config.n_gpu_layers)
  pushArg(args, '--chat-template-kwargs', normalizeChatTemplateKwargsText(config.chat_template_kwargs))
  pushArg(args, '--temp', config.temp)
  pushArg(args, '--top-k', config.top_k)
  pushArg(args, '--top-p', config.top_p)
  pushArg(args, '--min-p', config.min_p)
  pushArg(args, '--presence-penalty', config.presence_penalty)
  pushArg(args, '--repeat-penalty', config.repeat_penalty)
  pushArg(args, '--frequency-penalty', config.frequency_penalty)
  pushArg(args, '--repeat-last-n', config.repeat_last_n)
  pushArg(args, '--tfs-z', config.tfs_z)
  pushArg(args, '--typical-p', config.typical_p)
  pushArg(args, '--dry-multiplier', config.dry_multiplier)
  pushArg(args, '--dry-base', config.dry_base)
  pushArg(args, '--dry-allowed-length', config.dry_allowed_length)
  pushArg(args, '--dry-penalty-last-n', config.dry_penalty_last_n)
  pushArg(args, '--threads', config.threads)
  pushArg(args, '--threads-batch', config.threads_batch)
  pushArg(args, '--batch-size', config.batch_size)
  pushArg(args, '--ubatch-size', config.ubatch_size)
  pushArg(args, '--device', config.device)
  pushArg(args, '--split-mode', config.split_mode)
  pushArg(args, '--tensor-split', config.tensor_split)
  pushArg(args, '--main-gpu', config.main_gpu)
  pushArg(args, '--n-cpu-moe', config.n_cpu_moe)
  pushArg(args, '--log-verbosity', config.log_verbosity)

  // 开关型参数
  if (config.cpu_moe) args.push('--cpu-moe')
  if (config.verbose) args.push('--verbose')
  args.push(config.webui ? '--webui' : '--no-webui')
  if (config.embeddings) args.push('--embeddings')
  args.push(config.continuous_batching ? '--cont-batching' : '--no-cont-batching')

  // 追加额外参数
  args.push(...splitExtraArgs(config.extra_args))

  return args
}

/**
 * 构建启动详情（命令、参数、工作目录等）
 * @param {object} config - 配置对象
 * @returns {object} 启动详情对象
 */
export function buildLaunchDetails(config) {
  const directMode = config.launch_mode !== 'launcher'
  const command = directMode ? config.llama_server_path : config.launcher_path
  try {
    const args = directMode ? buildServerArgs(config) : []
    return {
      mode: directMode ? 'direct' : 'launcher',
      command,
      args,
      cwd: directMode ? path.dirname(config.llama_server_path) : path.dirname(config.config_path),
      preview: [command, ...args].map(quoteCommandPart).join(' '),
      error: '',
    }
  } catch (error) {
    return {
      mode: directMode ? 'direct' : 'launcher',
      command,
      args: [],
      cwd: directMode ? path.dirname(config.llama_server_path) : path.dirname(config.config_path),
      preview: quoteCommandPart(command),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
