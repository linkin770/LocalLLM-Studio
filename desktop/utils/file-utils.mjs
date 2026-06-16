/**
 * illama Desktop - 文件工具函数
 * 包含文件类型检测、附件解析、流式内容提取等纯函数
 */

import path from 'node:path'
import { readFile, stat } from 'node:fs/promises'

// ============ 文件类型检测 ============

/**
 * 获取文件的 MIME 类型
 * @param filePath - 文件路径
 * @returns MIME 类型字符串
 */
export function mimeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsm': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.toml': 'text/plain',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.csv': 'text/csv',
    '.log': 'text/plain',
    '.py': 'text/x-python',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
  }[ext] || 'application/octet-stream'
}

/**
 * 判断是否为文本类文件
 * @param filePath - 文件路径
 * @returns 是否为文本文件
 */
export function isTextLike(filePath) {
  return [
    '.txt', '.md', '.json', '.toml', '.yaml', '.yml', '.csv', '.log',
    '.py', '.js', '.ts', '.tsx', '.html', '.css', '.c', '.cpp', '.h', '.hpp',
  ].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为图片文件
 * @param filePath - 文件路径
 * @returns 是否为图片
 */
export function isImageLike(filePath) {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为音频文件
 * @param filePath - 文件路径
 * @returns 是否为音频
 */
export function isAudioLike(filePath) {
  return ['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为 PDF 文件
 * @param filePath - 文件路径
 * @returns 是否为 PDF
 */
export function isPdfLike(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf'
}

/**
 * 判断是否为 Word 文档
 * @param filePath - 文件路径
 * @returns 是否为 Word
 */
export function isWordLike(filePath) {
  return ['.docx', '.doc'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为 Excel 文件
 * @param filePath - 文件路径
 * @returns 是否为 Excel
 */
export function isExcelLike(filePath) {
  return ['.xlsx', '.xlsm', '.xls', '.xlsb'].includes(path.extname(filePath).toLowerCase())
}

/**
 * 判断是否为文档类文件
 * @param filePath - 文件路径
 * @returns 是否为文档
 */
export function isDocumentLike(filePath) {
  return isWordLike(filePath) || isExcelLike(filePath) || isTextLike(filePath)
}

/**
 * 构建附件对象（解析文件内容）
 * @param filePath - 文件路径
 * @returns 附件对象
 */
export async function buildAttachment(filePath) {
  const fileStat = await stat(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const isWord = isWordLike(filePath)
  const isExcel = isExcelLike(filePath)
  const isPdf = isPdfLike(filePath)
  const isSimpleText = isTextLike(filePath)

  // 确定附件类型
  let kind = 'file'
  if (isImageLike(filePath)) kind = 'image'
  else if (isAudioLike(filePath)) kind = 'audio'
  else if (isWord || isExcel || isPdf || isSimpleText) kind = 'text'

  const attachment = {
    path: filePath,
    name: path.basename(filePath),
    size: fileStat.size,
    mime: mimeForFile(filePath),
    kind,
  }

  // 图片附件：转换为 Base64
  if (attachment.kind === 'image' && fileStat.size <= 10 * 1024 * 1024) {
    const raw = await readFile(filePath)
    attachment.dataUrl = `data:${attachment.mime};base64,${raw.toString('base64')}`
  }

  // 文本附件：提取文本内容
  if (attachment.kind === 'text') {
    if (isWord) {
      try {
        const WordExtractorModule = await import('word-extractor')
        const WordExtractor = WordExtractorModule.default || WordExtractorModule
        const extractor = new WordExtractor()
        const buffer = await readFile(filePath)
        const doc = await extractor.extract(buffer)
        const text = doc.getBody() || ''
        attachment.text = text
        if (text.length > 50000) {
          attachment.warning = `Word内容较长（约${Math.round(text.length / 500)}词），建议分段提问`
        }
      } catch (error) {
        console.error('Word parsing error:', error)
        attachment.error = '无法解析Word文件，文件可能已损坏或使用了不受支持的格式'
      }
    } else if (isExcel) {
      try {
        const XLSXModule = await import('xlsx')
        const XLSX = XLSXModule.default || XLSXModule
        const buffer = await readFile(filePath)
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const texts = []
        let totalRows = 0
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          if (jsonData.length > 0) {
            totalRows += jsonData.length
            texts.push(`--- 工作表：${sheetName}（${jsonData.length}行）---`)
            texts.push(
              jsonData.slice(0, 200).map(row =>
                Object.entries(row)
                  .filter(([, v]) => String(v).trim())
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')
              ).join('\n')
            )
            if (jsonData.length > 200) {
              texts.push(`... 剩余 ${jsonData.length - 200} 行已省略`)
            }
          }
        }
        attachment.text = texts.join('\n\n')
        attachment.sheetCount = workbook.SheetNames.length
        attachment.totalRows = totalRows
        if (attachment.text && attachment.text.length > 50000) {
          attachment.warning = `Excel内容较长（${totalRows}行，${workbook.SheetNames.length}个工作表），建议分段提问`
        }
      } catch (error) {
        console.error('Excel parsing error:', error)
        const message = error instanceof Error ? error.message : String(error)
        attachment.error = `无法解析Excel文件（${message}），支持 .xlsx/.xlsm/.xls/.xlsb 格式`
      }
    } else if (isPdf) {
      if (fileStat.size > 100 * 1024 * 1024) {
        attachment.error = '文件过大（最大支持100MB），请使用PDF阅读器打开并复制文本内容'
      } else {
        try {
          const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js')
          const pdfParseFn = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default || pdfParseModule
          const pdfBuffer = await readFile(filePath)
          const pdfData = await pdfParseFn(pdfBuffer)
          attachment.text = pdfData.text
          attachment.pageCount = pdfData.numpages
          if (attachment.text && attachment.text.length > 50000) {
            attachment.warning = `PDF内容较长（约${Math.round(attachment.text.length / 500)}词），建议分段提问`
          }
        } catch (error) {
          console.error('PDF parsing error:', error)
          attachment.error = '无法解析PDF文件，可能是加密或损坏的文件'
        }
      }
    } else if (fileStat.size <= 256 * 1024) {
      attachment.text = await readFile(filePath, 'utf8')
    }
  }

  return attachment
}

/**
 * 从流式响应中提取内容
 * @param data - 响应数据
 * @returns 内容字符串
 */
export function contentFromStreamPayload(data) {
  const choice = data?.choices?.[0]
  return choice?.delta?.content || choice?.message?.content || data?.content || ''
}

/**
 * 提取消息中的文本内容
 * @param content - 消息内容（字符串或数组）
 * @returns 提取的文本内容
 */
export function messageTextContent(content) {
  if (Array.isArray(content)) {
    return content
      .filter(item => item && item.type === 'text')
      .map(item => String(item.text || '').trim())
      .filter(Boolean)
      .join('\n\n')
  }
  return String(content || '').trim()
}