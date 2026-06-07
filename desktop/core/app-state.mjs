/**
 * illama Desktop - 应用全局状态管理
 * 集中管理 logs、runtimeStatus、状态变更通知、应用状态聚合
 *
 * 设计：
 * - 通过订阅者模式解耦状态变更与 UI/托盘更新
 * - 业务模块可通过 addLog / setStatus 触发状态变更
 * - main.mjs 注册订阅者，将状态变更转发到 sendEvent 和 updateTray
 */

import { loadConfig } from './config-manager.mjs'

// ============ 全局状态 ============

/** 运行时状态：服务生命周期信息 */
let runtimeStatus = {
  state: 'stopped',                // stopped | starting | running | stopping | error
  message: '服务未启动',
  pid: null,
  url: 'http://127.0.0.1:8080',
  startedAt: null,
}

/** 日志列表（最近 1200 条） */
let logs = []

/** 状态变更订阅者列表 */
const statusSubscribers = []

/** 日志新增订阅者列表（接收 logs 全量 + 本次新增的 entries） */
const logSubscribers = []

// ============ 内部工具函数 ============

/**
 * 移除 ANSI 转义序列
 * @param value - 原始文本
 * @returns 清理后的文本
 */
function stripAnsi(value) {
  return String(value || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\[[0-9;]*m/g, '')
}

/**
 * 压缩日志行 - 过滤重复的例行日志
 * @param source - 日志来源（stdout/stderr/desktop）
 * @param line - 日志行
 * @returns 压缩后的日志行或 null（如果应该过滤）
 */
function compactLogLine(source, line) {
  const text = String(line || '').trim()
  const lower = text.toLowerCase()
  const isError = lower.includes('error') || lower.includes('fail') || lower.includes('exception')

  // 过滤例行的重复日志
  const routinePatterns = [
    'que start_loop: waiting for new tasks',
    'que start_loop: processing new tasks',
    'srv update_slots: all slots are idle',
    'srv update_slots: run slots completed',
    'srv update_slots: update slots',
  ]

  if (!isError && routinePatterns.some(pattern => lower.includes(pattern))) {
    return null
  }

  // 过滤流式输出的中间数据
  if (lower.includes('http: streamed chunk: data:')) {
    if (lower.includes('[done]')) {
      return 'stream chunk: [DONE]'
    }
    return null
  }

  // 过滤重复的消息内容（提示、响应等）
  if (!isError && (
    lower.startsWith('parsed message:') ||
    lower.startsWith('parsed chat message:') ||
    lower.startsWith('response:') ||
    lower.startsWith('assistant:') ||
    lower.startsWith('prompt:') ||
    text.includes('"prompt":') ||
    text.includes('<|im_start|>') ||
    text.includes('<!DOCTYPE html')
  )) {
    return null
  }

  // 截断过长的日志行
  if (text.length > 420) {
    return `${text.slice(0, 260)} ... [truncated ${text.length - 260} chars]`
  }

  return text
}

/**
 * 安全地触发订阅者（避免单个回调异常影响其他回调）
 */
function notify(subscribers, ...args) {
  for (const fn of subscribers) {
    try {
      fn(...args)
    } catch (error) {
      // 订阅者错误不应中断主流程
      console.error('[app-state] 订阅者执行失败：', error)
    }
  }
}

// ============ 状态访问 API ============

/**
 * 获取当前运行时状态（返回引用，调用方不应直接修改）
 */
export function getStatus() {
  return runtimeStatus
}

/**
 * 获取当前日志列表（返回引用，调用方不应直接修改）
 */
export function getLogs() {
  return logs
}

/**
 * 重置日志列表
 */
export function resetLogs() {
  logs = []
}

// ============ 状态变更 API ============

/**
 * 更新运行时状态并通知订阅者
 * @param {object} next - 状态更新对象（部分字段）
 */
export function setStatus(next) {
  runtimeStatus = { ...runtimeStatus, ...next }
  notify(statusSubscribers, runtimeStatus)
}

/**
 * 添加日志条目
 * @param {string} source - 日志来源（stdout/stderr/desktop）
 * @param {string|Buffer} chunk - 日志内容
 */
export function addLog(source, chunk) {
  const text = stripAnsi(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk))
  const entries = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => compactLogLine(source, line))
    .filter(Boolean)
    .map(line => ({ at: new Date().toISOString(), source, line }))

  if (entries.length === 0) {
    return
  }

  // 保留最近 1200 条日志
  logs = [...logs, ...entries].slice(-1200)

  // 通知订阅者（传递全量 logs + 本次新增的 entries）
  notify(logSubscribers, logs, entries)
}

// ============ 订阅者 API ============

/**
 * 订阅运行时状态变化
 * @param {Function} fn - 回调函数 (status) => void
 */
export function onStatusChange(fn) {
  statusSubscribers.push(fn)
}

/**
 * 订阅日志变化
 * @param {Function} fn - 回调函数 (allLogs, newEntries) => void
 */
export function onLogChange(fn) {
  logSubscribers.push(fn)
}

// ============ 应用状态聚合 ============

/**
 * 获取应用状态（聚合 config/status/logs/validation/launch）
 * @param {object} deps - 依赖注入
 * @param {Function} deps.validation - 验证配置函数
 * @param {Function} deps.buildLaunchDetails - 构建启动详情函数
 * @returns {Promise<object>} 应用状态对象
 */
export async function appState(deps = {}) {
  const { validation, buildLaunchDetails } = deps
  const config = await loadConfig(addLog, runtimeStatus)
  return {
    config,
    status: runtimeStatus,
    logs,
    validation: validation ? validation(config) : null,
    launch: buildLaunchDetails ? buildLaunchDetails(config) : null,
  }
}
