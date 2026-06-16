/**
 * illama Desktop - 模型工具
 * 模型文件名解析、参数格式化、JSON 安全获取
 */

/**
 * 安全地获取 JSON 数据
 * @param {string} url - 请求 URL
 * @returns {Promise<object|null>} JSON 对象或 null（请求失败时）
 */
export async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2800) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * 将数字转换为人类可读格式
 * @param {number} value - 数字值
 * @returns {string} 格式化后的字符串（如 1.5B, 2.3M）
 */
export function humanParams(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return ''
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
  return String(number)
}

/**
 * 从模型文件名解析量化级别
 * @param {string} fileName - 模型文件名
 * @returns {string} 量化级别（如 Q4_K_M）或 '未标注'
 */
export function parseQuantization(fileName) {
  const text = String(fileName || '')
  const match = text.match(/\.(q\d[^.]*)\.gguf$/i) || text.match(/\.(iq\d[^.]*)\.gguf$/i)
  return match?.[1]?.toUpperCase() || '未标注'
}

/**
 * 从模型文件名解析参数量级
 * @param {string} fileName - 模型文件名
 * @returns {string} 参数量级（如 7B）或 '未标注'
 */
export function parseParameterScale(fileName) {
  const match = String(fileName || '').match(/(\d+(?:\.\d+)?)B/i)
  return match ? `${match[1]}B` : '未标注'
}

/**
 * 从模型文件名提取模型家族名称
 * @param {string} fileName - 模型文件名
 * @returns {string} 模型家族名称
 */
export function parseFamily(fileName) {
  return String(fileName || '')
    .replace(/\.gguf$/i, '')
    .replace(/\.(q\d[^.]*)$/i, '')
    .replace(/\.(iq\d[^.]*)$/i, '')
}
