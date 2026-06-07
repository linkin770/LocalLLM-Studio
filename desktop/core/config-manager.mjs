/**
 * 配置管理模块
 * 负责配置的读取、保存、验证、TOML 解析与生成
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { app } = require('electron')
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ============ 路径配置 ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')   // 项目根目录（core/ 的上两级）
const llamaDir = path.join(rootDir, 'llama')
const authoredServerPath = path.join(llamaDir, 'llama-server.exe')
const authoredServerDir = llamaDir
const authoredBaseDir = llamaDir

// ============ 路径辅助函数 ============

/**
 * 获取默认基础目录 - 优先查找包含 config.toml 的目录
 */
function defaultBaseDir() {
  const candidates = [
    authoredBaseDir,
    path.resolve(rootDir, '..'),
    path.dirname(process.execPath),
    path.resolve(path.dirname(process.execPath), '..'),
  ]
  return candidates.find(candidate => existsSync(path.join(candidate, 'config.toml'))) || authoredBaseDir
}

/**
 * 获取默认配置文件路径
 */
function defaultConfigPath() {
  return path.join(defaultBaseDir(), 'config.toml')
}

/**
 * 获取默认启动器路径
 */
function defaultLauncherPath() {
  return path.join(defaultBaseDir(), 'llama-server-launcher.exe')
}

/**
 * 获取桌面状态文件路径（存储在用户数据目录）
 */
function defaultStatePath() {
  return path.join(app.getPath('userData'), 'desktop-state.json')
}

// ============ 默认配置 ============

/**
 * 获取默认配置对象
 * 包含所有 llama.cpp 启动参数的默认值
 */
export function getDefaultConfig() {
  return {
    launch_mode: 'direct',
    launcher_path: defaultLauncherPath(),
    config_path: defaultConfigPath(),
    llama_bin_dir: authoredServerDir,
    llama_server_path: authoredServerPath,
    model: '',
    mmproj: '',
    host: '0.0.0.0',
    port: 8080,
    ctx_size: 32768,
    n_predict: -1,
    n_gpu_layers: 99,
    chat_template_kwargs: '{"enable_thinking": false}',
    request_timeout_ms: 600000,
    temp: 0.8,
    top_k: 20,
    top_p: 0.95,
    min_p: 0,
    presence_penalty: 1.5,
    repeat_penalty: '',
    frequency_penalty: '',
    repeat_last_n: '',
    tfs_z: '',
    typical_p: '',
    dry_multiplier: '',
    dry_base: '',
    dry_allowed_length: '',
    dry_penalty_last_n: '',
    threads: '',
    threads_batch: '',
    batch_size: '',
    ubatch_size: '',
    cpu_moe: false,
    n_cpu_moe: '',
    device: '',
    split_mode: 'layer',
    tensor_split: '',
    main_gpu: '',
    extra_args: '',
    show_thinking: true,
    expand_thinking: false,
    show_raw_output: false,
    verbose: true,
    log_verbosity: 3,
    webui: true,
    embeddings: false,
    continuous_batching: true,
  }
}

// ============ TOML 解析与生成 ============

/**
 * 移除 TOML 行中的注释（保留字符串内的 #）
 */
function stripTomlComment(line) {
  let inString = false
  let escaped = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (char === '#' && !inString) {
      return line.slice(0, index)
    }
  }
  return line
}

/**
 * 解析 TOML 值
 */
function parseTomlValue(value) {
  const text = value.trim()
  if (!text) {
    return ''
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text)
    } catch {
      return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  }
  if (text === 'true') {
    return true
  }
  if (text === 'false') {
    return false
  }
  if (/^[+-]?\d+$/.test(text)) {
    return Number.parseInt(text, 10)
  }
  if (/^[+-]?\d+\.\d+$/.test(text)) {
    return Number.parseFloat(text)
  }
  return text
}

/**
 * 解析 TOML 字符串
 */
function parseToml(raw) {
  const result = {}
  for (const originalLine of raw.split(/\r?\n/)) {
    const line = stripTomlComment(originalLine).trim()
    if (!line || line.startsWith('[')) {
      continue
    }
    const equalIndex = line.indexOf('=')
    if (equalIndex < 0) {
      continue
    }
    const key = line.slice(0, equalIndex).trim()
    const value = line.slice(equalIndex + 1)
    result[key] = parseTomlValue(value)
  }
  return result
}

/**
 * 将值转换为数字（带默认值）
 */
export function toNumber(value, fallback = '') {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

/**
 * 将值转换为数字（空值返回空字符串）
 */
export function toNumberEmpty(value) {
  return toNumber(value, '')
}

/**
 * 检查值是否非空
 */
export function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * 规范化配置对象
 */
export function normalizeConfig(values, state = {}) {
  const base = getDefaultConfig()
  const merged = { ...base, ...state, ...values }
  const launchMode = merged.launch_mode === 'launcher' ? 'launcher' : 'direct'
  const llamaBinDir = hasValue(merged.llama_bin_dir)
    ? String(merged.llama_bin_dir)
    : path.dirname(String(merged.llama_server_path || base.llama_server_path))
  
  return {
    ...merged,
    launch_mode: launchMode,
    llama_bin_dir: llamaBinDir,
    llama_server_path: path.join(llamaBinDir, 'llama-server.exe'),
    port: toNumber(merged.port, base.port),
    ctx_size: toNumber(merged.ctx_size, base.ctx_size),
    n_predict: toNumber(merged.n_predict, base.n_predict),
    n_gpu_layers: toNumber(merged.n_gpu_layers, base.n_gpu_layers),
    request_timeout_ms: toNumber(merged.request_timeout_ms, base.request_timeout_ms),
    temp: toNumber(merged.temp, base.temp),
    top_k: toNumber(merged.top_k, base.top_k),
    top_p: toNumber(merged.top_p, base.top_p),
    min_p: toNumber(merged.min_p, base.min_p),
    presence_penalty: toNumber(merged.presence_penalty, base.presence_penalty),
    repeat_penalty: toNumberEmpty(merged.repeat_penalty),
    frequency_penalty: toNumberEmpty(merged.frequency_penalty),
    repeat_last_n: toNumberEmpty(merged.repeat_last_n),
    tfs_z: toNumberEmpty(merged.tfs_z),
    typical_p: toNumberEmpty(merged.typical_p),
    dry_multiplier: toNumberEmpty(merged.dry_multiplier),
    dry_base: toNumberEmpty(merged.dry_base),
    dry_allowed_length: toNumberEmpty(merged.dry_allowed_length),
    dry_penalty_last_n: toNumberEmpty(merged.dry_penalty_last_n),
    log_verbosity: toNumber(merged.log_verbosity, base.log_verbosity),
    extra_args: String(merged.extra_args || ''),
    show_thinking: merged.show_thinking !== false,
    expand_thinking: Boolean(merged.expand_thinking),
    show_raw_output: Boolean(merged.show_raw_output),
    verbose: Boolean(merged.verbose),
    webui: Boolean(merged.webui),
    embeddings: Boolean(merged.embeddings),
    continuous_batching: Boolean(merged.continuous_batching),
    cpu_moe: Boolean(merged.cpu_moe),
  }
}

/**
 * 将值转换为 TOML 字符串格式
 */
function tomlString(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 生成可选数字行（空值返回 null）
 */
function optionalNumberLine(key, value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  return `${key} = ${value}`
}

/**
 * 根据配置对象构建 TOML 字符串
 */
export function buildToml(config) {
  const lines = [
    '# config.toml',
    '# Generated by illama Desktop.',
    '',
    '# desktop launch mode: direct or launcher',
    `launch_mode = ${tomlString(config.launch_mode || 'direct')}`,
    '',
    '# llama-server.exe 的绝对路径',
    `llama_server_path = ${tomlString(config.llama_server_path)}`,
    '',
    '# 模型路径',
    `model = ${tomlString(config.model)}`,
  ]

  if (config.mmproj) {
    lines.push('', '# 多模态投影文件', `mmproj = ${tomlString(config.mmproj)}`)
  } else {
    lines.push('', '# mmproj = "G:\\\\llama.cpp\\\\models\\\\your-model\\\\mmproj.gguf"')
  }

  lines.push(
    '',
    '# 服务器设置',
    `host = ${tomlString(config.host)}`,
    `port = ${config.port}`,
    '',
    '# 常用参数',
    `ctx_size = ${config.ctx_size}`,
    `n_predict = ${config.n_predict}`,
    `n_gpu_layers = ${config.n_gpu_layers}`,
    `request_timeout_ms = ${config.request_timeout_ms}`,
    '',
    '# 对话模板参数',
    `chat_template_kwargs = ${tomlString(config.chat_template_kwargs)}`,
    '',
    '# 采样设置',
    `temp = ${config.temp}`,
    `top_k = ${config.top_k}`,
    `top_p = ${config.top_p}`,
    `min_p = ${config.min_p}`,
    `presence_penalty = ${config.presence_penalty}`,
  )

  const repeatPenalty = optionalNumberLine('repeat_penalty', config.repeat_penalty)
  if (repeatPenalty) {
    lines.push(repeatPenalty)
  }

  for (const [key, value] of [
    ['frequency_penalty', config.frequency_penalty],
    ['repeat_last_n', config.repeat_last_n],
    ['tfs_z', config.tfs_z],
    ['typical_p', config.typical_p],
    ['dry_multiplier', config.dry_multiplier],
    ['dry_base', config.dry_base],
    ['dry_allowed_length', config.dry_allowed_length],
    ['dry_penalty_last_n', config.dry_penalty_last_n],
  ]) {
    const line = optionalNumberLine(key, value)
    if (line) lines.push(line)
  }

  lines.push('', '# 系统设置')
  for (const [key, value] of [
    ['threads', config.threads],
    ['threads_batch', config.threads_batch],
    ['batch_size', config.batch_size],
    ['ubatch_size', config.ubatch_size],
  ]) {
    const line = optionalNumberLine(key, value)
    lines.push(line || `# ${key} = `)
  }

  lines.push('', '# 混合专家模型设置')
  if (config.cpu_moe) {
    lines.push('cpu_moe = true')
  } else {
    lines.push('# cpu_moe = true')
  }
  const nCpuMoe = optionalNumberLine('n_cpu_moe', config.n_cpu_moe)
  lines.push(nCpuMoe || '# n_cpu_moe = 15')

  lines.push('', '# GPU 设置')
  if (config.device) {
    lines.push(`device = ${tomlString(config.device)}`)
  } else {
    lines.push('# device = ""')
  }
  if (config.split_mode) {
    lines.push(`split_mode = ${tomlString(config.split_mode)}`)
  }
  if (config.tensor_split) {
    lines.push(`tensor_split = ${tomlString(config.tensor_split)}`)
  } else {
    lines.push('# tensor_split = "3,1"')
  }
  const mainGpu = optionalNumberLine('main_gpu', config.main_gpu)
  lines.push(mainGpu || '# main_gpu = 0')

  lines.push(
    '',
    '# 日志与功能',
    `verbose = ${config.verbose ? 'true' : 'false'}`,
    `log_verbosity = ${config.log_verbosity}`,
    `webui = ${config.webui ? 'true' : 'false'}`,
    `embeddings = ${config.embeddings ? 'true' : 'false'}`,
    `continuous_batching = ${config.continuous_batching ? 'true' : 'false'}`,
    '',
    '# 额外 llama-server 参数，会追加到最终启动命令末尾',
    `extra_args = ${tomlString(config.extra_args)}`,
    `show_thinking = ${config.show_thinking ? 'true' : 'false'}`,
    `expand_thinking = ${config.expand_thinking ? 'true' : 'false'}`,
    `show_raw_output = ${config.show_raw_output ? 'true' : 'false'}`,
    '',
  )

  return lines.join('\n')
}

// ============ 文件读写 ============

/**
 * 读取 JSON 文件（带错误处理）
 */
async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * 写入桌面状态文件
 */
async function writeDesktopState(config) {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(
    defaultStatePath(),
    JSON.stringify(
      {
        config_path: config.config_path,
        launch_mode: config.launch_mode,
        launcher_path: config.launcher_path,
        config,
      },
      null,
      2,
    ),
    'utf8',
  )
}

/**
 * 加载配置（从桌面状态和 TOML 文件）
 */
export async function loadConfig(addLog, runtimeStatus) {
  const state = await readJson(defaultStatePath(), {})
  const configPath = state.config_path || defaultConfigPath()
  let parsed = {}
  if (existsSync(configPath)) {
    try {
      parsed = parseToml(await readFile(configPath, 'utf8'))
    } catch (error) {
      addLog('desktop', `读取配置失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const config = normalizeConfig({ ...parsed, ...(state.config || {}) }, {
    config_path: configPath,
    launch_mode: state.launch_mode || state.config?.launch_mode || parsed.launch_mode || 'direct',
    launcher_path: state.launcher_path || defaultLauncherPath(),
  })
  runtimeStatus.url = `http://${config.host && config.host !== '0.0.0.0' ? config.host : '127.0.0.1'}:${config.port}`
  return config
}

/**
 * 保存配置（同时保存到 TOML 和桌面状态）
 */
export async function saveConfig(config, runtimeStatus) {
  const normalized = normalizeConfig(config)
  if (normalized.launch_mode === 'launcher') {
    await mkdir(path.dirname(normalized.config_path), { recursive: true })
    await writeFile(normalized.config_path, buildToml(normalized), 'utf8')
  }
  await writeDesktopState(normalized)
  runtimeStatus.url = `http://${normalized.host && normalized.host !== '0.0.0.0' ? normalized.host : '127.0.0.1'}:${normalized.port}`
  return normalized
}

/**
 * 解析额外命令行参数
 */
export function splitExtraArgs(raw) {
  const text = String(raw || '').replace(/\r?\n/g, ' ').trim()
  if (!text) {
    return []
  }

  const args = []
  let current = ''
  let quote = ''

  for (const char of text) {
    if (quote) {
      if (char === quote) {
        quote = ''
      } else {
        current += char
      }
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === ' ') {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    args.push(current)
  }

  return args
}

// ============ URL 工具 ============

/**
 * 构建本地服务 URL
 * @param {object} config - 配置对象
 * @returns {string} 完整的本地 URL
 */
export function localUrl(config) {
  const host = config.host && config.host !== '0.0.0.0' ? config.host : '127.0.0.1'
  return `http://${host}:${config.port}`
}

// ============ 验证 ============

/**
 * 验证配置完整性
 * @param {object} config - 配置对象
 * @returns {object} 验证结果对象
 */
export function validation(config) {
  return {
    configExists: config.launch_mode !== 'launcher' || existsSync(config.config_path),
    launcherExists: config.launch_mode !== 'launcher' || existsSync(config.launcher_path),
    serverExists: existsSync(config.llama_server_path),
    modelExists: existsSync(config.model),
    mmprojExists: !config.mmproj || existsSync(config.mmproj),
  }
}
