import type { ParsedSegment } from './types'

/**
 * Parses an agent response into renderable segments:
 * - plain text / markdown
 * - tables (markdown tables or ```table fences)
 * - charts (```chart-data fences with JSON)
 */
export function parseAgentResponse(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []

  // Split by code fences while preserving the fence content
  const fenceRegex = /```(chart-data|table)\s*\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fenceRegex.exec(raw)) !== null) {
    // Text before this fence
    const before = raw.slice(lastIndex, match.index).trim()
    if (before) {
      // Check if the text block contains a markdown table
      const textSegments = extractMarkdownTables(before)
      segments.push(...textSegments)
    }

    const fenceType = match[1]
    const fenceContent = match[2].trim()

    if (fenceType === 'chart-data') {
      const chartSegment = parseChartData(fenceContent)
      if (chartSegment) segments.push(chartSegment)
    } else if (fenceType === 'table') {
      const tableSegment = parseMarkdownTable(fenceContent)
      if (tableSegment) segments.push(tableSegment)
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last fence
  const remaining = raw.slice(lastIndex).trim()
  if (remaining) {
    const textSegments = extractMarkdownTables(remaining)
    segments.push(...textSegments)
  }

  // If nothing was parsed, return the raw text as-is
  if (segments.length === 0 && raw.trim()) {
    segments.push({ type: 'text', content: raw.trim() })
  }

  return segments
}


/** Parse a ```chart-data block into a chart segment */
function parseChartData(content: string): ParsedSegment | null {
  try {
    const parsed = JSON.parse(content)
    const chartType = parsed.type || 'bar'
    const xKey = parsed.xKey || ''
    const yKeys: string[] = parsed.yKeys || []
    const data: Record<string, unknown>[] = parsed.data || []

    if (data.length === 0) return null

    // Auto-detect keys if not specified
    if (!xKey && data.length > 0) {
      const keys = Object.keys(data[0])
      return {
        type: 'chart',
        content,
        chartData: data,
        chartType,
        chartConfig: { xKey: keys[0], yKeys: keys.slice(1) },
      }
    }

    return {
      type: 'chart',
      content,
      chartData: data,
      chartType,
      chartConfig: { xKey, yKeys },
    }
  } catch {
    return null
  }
}


/** Parse a markdown table string into a table segment */
function parseMarkdownTable(content: string): ParsedSegment | null {
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return null

  const parseLine = (line: string) =>
    line.split('|').map((c) => c.trim()).filter(Boolean)

  const headers = parseLine(lines[0])

  // Skip the separator line (---|---|---)
  const startIdx = lines[1].match(/^[\s|:-]+$/) ? 2 : 1
  const rows = lines.slice(startIdx).map(parseLine)

  if (headers.length === 0) return null

  return {
    type: 'table',
    content,
    tableHeaders: headers,
    tableRows: rows,
  }
}


/** Split text that may contain inline markdown tables */
function extractMarkdownTables(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const lines = text.split('\n')

  let currentText: string[] = []
  let tableLines: string[] = []
  let inTable = false

  for (const line of lines) {
    const isTableLine = /^\s*\|.*\|/.test(line)
    const isSeparator = /^\s*\|?[\s:-]+\|/.test(line) && line.includes('-')

    if (isTableLine || (inTable && isSeparator)) {
      if (!inTable && currentText.length > 0) {
        segments.push({ type: 'text', content: currentText.join('\n').trim() })
        currentText = []
      }
      inTable = true
      tableLines.push(line)
    } else {
      if (inTable) {
        // End of table
        const tableSegment = parseMarkdownTable(tableLines.join('\n'))
        if (tableSegment) {
          segments.push(tableSegment)
        } else {
          currentText.push(...tableLines)
        }
        tableLines = []
        inTable = false
      }
      currentText.push(line)
    }
  }

  // Flush remaining
  if (inTable && tableLines.length > 0) {
    const tableSegment = parseMarkdownTable(tableLines.join('\n'))
    if (tableSegment) {
      segments.push(tableSegment)
    } else {
      currentText.push(...tableLines)
    }
  }

  if (currentText.length > 0) {
    const txt = currentText.join('\n').trim()
    if (txt) segments.push({ type: 'text', content: txt })
  }

  return segments
}
