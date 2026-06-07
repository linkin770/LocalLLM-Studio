/**
 * illama Desktop - 技能管理 IPC 处理
 * 技能列表、创建、读取、删除、自动生成
 * 兼容 Claude Code SKILL.md 格式
 */

import path from 'node:path'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { localUrl } from '../core/config-manager.mjs'

/**
 * 解析 SKILL.md 文件的 frontmatter
 * @param {string} content - SKILL.md 全文
 * @returns {object} 解析后的字段
 */
function parseSkillMarkdown(content) {
  // Match frontmatter: opening --- to either closing --- or EOF
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)(\r?\n---|$)/)
  if (!fmMatch) return { name: '', description: '', whenToUse: '', argumentHint: '', body: content }
  const fm = fmMatch[1]
  const body = content.slice(fmMatch[0].length).trim()
  const get = (key) => {
    const m = fm.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'))
    return m ? m[1].trim() : ''
  }
  const toolsMatch = fm.match(/^allowedTools:\s*\r?\n([\s\S]*?)(?=\r?\n\w|$)/m)
  let allowedTools = []
  if (toolsMatch) {
    allowedTools = toolsMatch[1].split('\n').map(l => l.trim().replace(/^-\s*/, '')).filter(Boolean)
  }
  return {
    name: get('name'),
    description: get('description'),
    whenToUse: get('whenToUse'),
    argumentHint: get('argumentHint') || '',
    allowedTools,
    body,
  }
}

/**
 * 后处理：强制覆盖 SKILL.md 的 frontmatter 字段
 * 解决 LLM 生成时这 4 个字段为空/缺失/字段名不一致的问题
 * @param {string} content - LLM 返回的内容
 * @param {object} values - 用户输入的 4 个字段
 * @returns {string} 修正后的内容
 */
function enforceFrontmatter(content, values) {
  const { name, description, whenToUse, argumentHint } = values
  const fieldMap = {
    name,
    description,
    whenToUse,
    argumentHint,
  }

  // 找到 frontmatter 起始和结束位置
  const fmStartMatch = content.match(/^---\r?\n/)
  if (!fmStartMatch) {
    // 没有 frontmatter，直接构造一个
    const lines = Object.entries(fieldMap)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    return `---\n${lines}\nallowedTools:\n  - Read\n  - Write\n---\n\n${content}`
  }

  const fmStart = fmStartMatch[0].length
  const rest = content.slice(fmStart)
  // 找到 frontmatter 结束（下一个 --- 行首）
  const fmEndMatch = rest.match(/\r?\n---\r?\n?/)
  if (!fmEndMatch) {
    // 异常情况：未闭合的 frontmatter，直接在末尾补一个 ---
    const lines = Object.entries(fieldMap)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    return `---\n${lines}\nallowedTools:\n  - Read\n  - Write\n---\n\n${content}`
  }

  const fmBody = rest.slice(0, fmEndMatch.index)
  const afterFm = rest.slice(fmEndMatch.index + fmEndMatch[0].length)

  // 解析并覆盖字段
  const lines = fmBody.split(/\r?\n/)
  const newLines = []
  const handledKeys = new Set()

  for (const line of lines) {
    // 匹配 "key: value" 形式
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (m && fieldMap.hasOwnProperty(m[1]) && fieldMap[m[1]]) {
      newLines.push(`${m[1]}: ${fieldMap[m[1]]}`)
      handledKeys.add(m[1])
    } else if (m && m[1] === 'allowedTools') {
      // 保留 allowedTools 原样
      newLines.push(line)
    } else if (!m || !fieldMap.hasOwnProperty(m[1])) {
      // 非目标字段或其他内容，保留
      newLines.push(line)
    }
    // 目标字段但值为空 → 跳过，下面会强制追加
  }

  // 强制追加未处理的字段（按固定顺序）
  const order = ['name', 'description', 'whenToUse', 'argumentHint']
  for (const key of order) {
    if (!handledKeys.has(key) && fieldMap[key]) {
      newLines.push(`${key}: ${fieldMap[key]}`)
      handledKeys.add(key)
    }
  }

  return content.slice(0, fmStart) + newLines.join('\n') + fmEndMatch[0] + afterFm
}

/**
 * 注册技能管理相关的 IPC 处理程序
 * @param {import('electron').IpcMain} ipcMain
 * @param {string} rootDir - 项目根目录
 * @param {Function} addLog - 日志函数
 * @param {object} runtimeStatus - 运行时状态对象（含 state、url 等）
 * @param {Function} loadConfig - 加载配置的异步函数
 */
export function registerSkillHandlers(ipcMain, rootDir, addLog, runtimeStatus, loadConfig) {
  const skillsDir = path.join(rootDir, 'skills')

  /**
   * 列出所有技能
   */
  ipcMain.handle('llama:skill-list', async () => {
    try {
      await fs.mkdir(skillsDir, { recursive: true })
      const entries = await fs.readdir(skillsDir, { withFileTypes: true })
      const skills = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const mdPath = path.join(skillsDir, entry.name, 'SKILL.md')
        if (!existsSync(mdPath)) continue
        const content = await fs.readFile(mdPath, 'utf-8')
        const parsed = parseSkillMarkdown(content)
        skills.push({ dirName: entry.name, filePath: mdPath, ...parsed })
      }
      return skills
    } catch (error) {
      console.error('skill-list error:', error)
      return []
    }
  })

  /**
   * 创建技能
   */
  ipcMain.handle('llama:skill-create', async (_event, payload) => {
    const { name, content } = payload
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_').trim()
    if (!safeName) throw new Error('Skill name cannot be empty')
    const skillDir = path.join(skillsDir, safeName)
    await fs.mkdir(skillDir, { recursive: true })
    const mdPath = path.join(skillDir, 'SKILL.md')
    await fs.writeFile(mdPath, content, 'utf-8')
    return { ok: true, dirName: safeName, filePath: mdPath }
  })

  /**
   * 删除技能
   */
  ipcMain.handle('llama:skill-delete', async (_event, payload) => {
    const { name } = payload
    if (!name) throw new Error('Skill name cannot be empty')
    const skillDir = path.join(skillsDir, name)
    if (existsSync(skillDir)) {
      rmSync(skillDir, { recursive: true, force: true })
    }
    return { ok: true }
  })

  /**
   * 读取单个技能
   */
  ipcMain.handle('llama:skill-read', async (_event, payload) => {
    const { name } = payload
    if (!name) throw new Error('Skill name cannot be empty')
    const skillDir = path.join(skillsDir, name)
    const mdPath = path.join(skillDir, 'SKILL.md')
    if (!existsSync(mdPath)) throw new Error('SKILL.md not found')
    const raw = await fs.readFile(mdPath, 'utf-8')
    const parsed = parseSkillMarkdown(raw)
    return { dirName: name, filePath: mdPath, raw, ...parsed }
  })

  /**
   * 自动生成 SKILL.md 内容（调用本地 LLM）
   */
  ipcMain.handle('llama:skill-generate', async (_event, payload) => {
    const { name, description, whenToUse, argumentHint } = payload
    if (!name) throw new Error('Skill name cannot be empty')

    const config = await loadConfig(addLog, runtimeStatus)
    const url = localUrl(config) + '/v1/chat/completions'

    const systemPrompt = [
      'You are a skill definition generator. Based on the requirements below, generate a COMPLETE SKILL.md file following the Claude Code SKILL.md format exactly.',
      '',
      '## Output Format (strictly follow this)',
      '---',
      'name: [exact skill name]',
      'description: [1-2 sentence description]',
      'whenToUse: [clear trigger condition]',
      'argumentHint: [optional hint for ARGUMENTS]',
      'allowedTools:',
      '  - Read',
      '  - Write',
      '---',
      '',
      '[Detailed system prompt for the AI assistant, 3-8 paragraphs, covering:',
      ' - Role and expertise definition',
      ' - Step-by-step workflow instructions',
      ' - Output format requirements',
      ' - Important constraints and notes]',
      '',
      'ARGUMENTS_PLACEHOLDER',
      '',
      'CRITICAL RULES:\n1. Start with --- on its own line\n2. End with --- on its own line after allowedTools\n3. NO markdown code fences\n4. NO explanations before or after\n5. Output ONLY the SKILL.md, nothing else.',
    ].join('\n')

    const userPrompt = [
      '## User Requirements',
      '- Name: ' + name,
      '- Description: ' + (description || '(not specified)'),
      '- When to use: ' + (whenToUse || '(not specified)'),
      '- Argument hint: ' + (argumentHint || '(none)'),
      '',
      'Generate the SKILL.md now:',
    ].join('\n')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: path.basename(config.model || 'local-model'),
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error('LLM returned ' + response.status + (text ? ': ' + text.slice(0, 300) : ''))
    }

    const data = await response.json()
    let content = data?.choices?.[0]?.message?.content || data?.content || ''
    content = String(content || '').trim()

    // 清理 markdown 代码围栏
    content = content.replace(/^```(?:markdown|yaml)?\s*\n?/i, '').replace(/\n?```\s*$/, '')

    // 后处理：用用户输入强制覆盖 frontmatter 字段，确保 name/description/whenToUse/argumentHint 不为空
    content = enforceFrontmatter(content, { name, description, whenToUse, argumentHint })

    return { ok: true, content }
  })

  // 初始化日志
  if (addLog) {
    addLog('desktop', `[技能] 已初始化：${skillsDir}`)
  }
}