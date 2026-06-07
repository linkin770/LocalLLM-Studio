/**
 * illama Desktop - 服务器生命周期管理
 * 负责 llama-server.exe 进程的启动、停止、健康检查、模型信息获取
 */

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { ipcMain } = require('electron')
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { addLog, setStatus, getStatus, resetLogs, appState } from '../core/app-state.mjs'
import { normalizeConfig, saveConfig, localUrl, validation, toNumber } from '../core/config-manager.mjs'
import { buildLaunchDetails } from '../utils/server-args.mjs'
import { fetchJson, humanParams, parseQuantization, parseParameterScale, parseFamily } from '../utils/model-utils.mjs'

// ============ 进程状态 ============

/** 服务器进程实例 */
let serverChild = null

/** 是否正在停止服务器 */
let stoppingServer = false

// ============ 状态访问 ============

/**
 * 获取服务器进程实例
 */
export function getServerChild() {
  return serverChild
}

/**
 * 设置服务器进程实例
 */
export function setServerChild(value) {
  serverChild = value
}

/**
 * 获取是否正在停止服务器
 */
export function isStoppingServer() {
  return stoppingServer
}

/**
 * 设置是否正在停止服务器
 */
export function setStoppingServer(value) {
  stoppingServer = value
}

// ============ 进程管理 ============

/**
 * 使用 taskkill 终止进程（Windows 专用）
 * @param {number} pid - 进程 ID
 */
export async function taskkill(pid) {
  await new Promise(resolve => {
    const child = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    child.once('exit', resolve)
    child.once('error', resolve)
  })
}

/**
 * 启动服务器（内部使用）
 * @param {object} config - 配置对象
 * @returns {object} 启动详情
 */
function launchServerProcess(config) {
  const launch = buildLaunchDetails(config)
  if (launch.error) {
    throw new Error(launch.error)
  }

  const serverDir = path.dirname(config.llama_server_path)
  const command = launch.command
  const args = launch.args
  const cwd = launch.cwd
  const directMode = config.launch_mode !== 'launcher'

  // 记录启动信息
  addLog('desktop', `启动方式：${directMode ? 'direct llama-server.exe' : 'launcher'}`)
  addLog('desktop', `llama-server：${config.llama_server_path}`)
  if (directMode) {
    addLog('desktop', `参数：${args.join(' ')}`)
    addLog('desktop', `完整命令：${launch.preview}`)
    addLog('desktop', `关键参数：ctx=${config.ctx_size}, gpu_layers=${config.n_gpu_layers}, batch=${config.batch_size || 'auto'}, ubatch=${config.ubatch_size || 'auto'}, threads=${config.threads || 'auto'}`)
  }
  addLog('desktop', `启动器：${config.launcher_path}`)
  addLog('desktop', `配置：${config.config_path}`)

  // 启动进程
  serverChild = spawn(command, args, {
    cwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NO_COLOR: '1',
      Path: `${serverDir};${process.env.Path || process.env.PATH || ''}`,
    },
  })

  setStatus({ pid: serverChild.pid })

  // 监听进程输出
  serverChild.stdout?.on('data', chunk => addLog('stdout', chunk))
  serverChild.stderr?.on('data', chunk => addLog('stderr', chunk))

  // 监听进程错误
  serverChild.once('error', error => {
    addLog('desktop', `启动失败：${error.message}`)
    setStatus({ state: 'error', message: error.message, pid: null })
  })

  // 监听进程退出
  serverChild.once('exit', code => {
    const message = stoppingServer ? '服务已停止' : `服务进程已退出：${code ?? 'unknown'}`
    addLog('desktop', message)
    serverChild = null
    setStatus({
      state: stoppingServer ? 'stopped' : 'error',
      message,
      pid: null,
    })
    stoppingServer = false
  })

  return launch
}

// ============ IPC 处理器注册 ============

/**
 * 注册服务器相关的 IPC 处理器
 */
export function registerServerHandlers() {
  /**
   * 启动服务器
   */
  ipcMain.handle('llama:start-server', async (_event, payload) => {
    // 如果服务器已在运行，直接返回状态
    if (serverChild && serverChild.exitCode === null) {
      return appState({ validation, buildLaunchDetails })
    }

    const config = await saveConfig(payload.config, getStatus())
    const directMode = config.launch_mode !== 'launcher'

    // 验证文件存在性
    if (!directMode && !existsSync(config.launcher_path)) {
      throw new Error(`找不到启动器：${config.launcher_path}`)
    }
    if (!existsSync(config.llama_server_path)) {
      throw new Error(`找不到 llama-server.exe：${config.llama_server_path}`)
    }
    if (!existsSync(config.model)) {
      throw new Error(`找不到模型文件：${config.model}`)
    }

    // 重置状态
    resetLogs()
    stoppingServer = false
    setStatus({
      state: 'starting',
      message: '正在启动服务',
      pid: null,
      url: localUrl(config),
      startedAt: new Date().toISOString(),
    })

    launchServerProcess(config)
    return appState({ validation, buildLaunchDetails })
  })

  /**
   * 停止服务器
   */
  ipcMain.handle('llama:stop-server', async () => {
    if (serverChild && serverChild.exitCode === null) {
      stoppingServer = true
      setStatus({ state: 'stopping', message: '正在停止服务' })
      await taskkill(serverChild.pid)
    }
    return appState({ validation, buildLaunchDetails })
  })

  /**
   * 测试服务健康状态
   */
  ipcMain.handle('llama:test-health', async (_event, payload) => {
    const config = normalizeConfig(payload.config)
    const url = localUrl(config)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) })
      return { ok: response.ok, status: response.status, url }
    } catch (error) {
      return { ok: false, status: 0, url, message: error instanceof Error ? error.message : String(error) }
    }
  })

  /**
   * 获取模型信息
   */
  ipcMain.handle('llama:get-model-info', async (_event, payload) => {
    const config = normalizeConfig(payload?.config || {})
    const serverUrl = localUrl(config)
    const modelPath = config.model || ''
    const fileName = path.basename(modelPath || 'local-model')
    let fileSize = 0
    if (modelPath && existsSync(modelPath)) {
      try {
        fileSize = (await stat(modelPath)).size
      } catch {
        fileSize = 0
      }
    }

    const [modelsPayload, propsPayload] = await Promise.all([
      fetchJson(`${serverUrl}/v1/models`),
      fetchJson(`${serverUrl}/props`),
    ])

    const apiModel = modelsPayload?.data?.[0] || {}
    const apiMeta = apiModel?.meta || {}
    const listedModel = modelsPayload?.models?.[0] || {}

    return {
      name: listedModel?.name || apiModel?.id || propsPayload?.model_alias || fileName,
      filePath: propsPayload?.model_path || modelPath,
      fileSize: Number(apiMeta?.size || fileSize || 0),
      family: listedModel?.details?.family || parseFamily(fileName),
      quantization: listedModel?.details?.quantization_level || parseQuantization(fileName),
      parameterScale: listedModel?.details?.parameter_size || parseParameterScale(fileName),
      nParams: Number(apiMeta?.n_params || 0),
      ctxSize: toNumber(propsPayload?.default_generation_settings?.n_ctx, toNumber(config.ctx_size, '')),
      trainingContext: toNumber(apiMeta?.n_ctx_train, ''),
      embeddingSize: toNumber(apiMeta?.n_embd, ''),
      vocabSize: toNumber(apiMeta?.n_vocab, ''),
      vocabType: toNumber(apiMeta?.vocab_type, ''),
      parallelSlots: toNumber(propsPayload?.total_slots, ''),
      nPredict: toNumber(config.n_predict, ''),
      gpuLayers: toNumber(config.n_gpu_layers, ''),
      temperature: toNumber(config.temp, ''),
      topP: toNumber(config.top_p, ''),
      topK: toNumber(config.top_k, ''),
      minP: toNumber(config.min_p, ''),
      presencePenalty: toNumber(config.presence_penalty, ''),
      repeatPenalty: toNumber(config.repeat_penalty, ''),
      serverUrl,
      build: propsPayload?.build_info || path.basename(config.llama_server_path || 'llama-server.exe'),
      chatTemplateText: String(propsPayload?.chat_template || config.chat_template_kwargs || '').trim(),
      propsSource: Boolean(propsPayload),
      modelSource: Boolean(modelsPayload),
      parameterLabel: humanParams(apiMeta?.n_params),
    }
  })
}
