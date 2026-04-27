'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { parseAgentResponse } from '@/lib/parseAgentResponse'
import { CHART_COLORS } from '@/lib/utils'
import type { ParsedSegment } from '@/lib/types'

interface Props {
  content: string
  isThinking?: boolean
  thinkingStatus?: string
}

export function ChatMessageContent({ content, isThinking, thinkingStatus }: Props) {
  const segments = useMemo(() => {
    if (!content) return []
    return parseAgentResponse(content)
  }, [content])

  if (isThinking) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        {thinkingStatus || 'Thinking...'}
      </div>
    )
  }

  if (segments.length === 0 && !content) return null

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => (
        <SegmentRenderer key={i} segment={seg} />
      ))}
    </div>
  )
}

function SegmentRenderer({ segment }: { segment: ParsedSegment }) {
  switch (segment.type) {
    case 'table':
      return <TableRenderer segment={segment} />
    case 'chart':
      return <ChartRenderer segment={segment} />
    case 'text':
    default:
      return <TextRenderer content={segment.content} />
  }
}

// ── Text renderer (basic markdown) ──────────────────────────────────────────

function TextRenderer({ content }: { content: string }) {
  // Very basic markdown: bold, italic, inline code, headers, line breaks
  const html = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-800 px-1 py-0.5 text-xs text-indigo-300">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-slate-200 mt-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-slate-100 mt-3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-base font-bold text-slate-100 mt-3">$1</h2>')
    .replace(/\n/g, '<br />')

  return (
    <div
      className="text-sm leading-relaxed text-slate-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── Table renderer ──────────────────────────────────────────────────────────

function TableRenderer({ segment }: { segment: ParsedSegment }) {
  const { tableHeaders = [], tableRows = [] } = segment
  if (tableHeaders.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            {tableHeaders.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium text-slate-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-slate-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Chart renderer ──────────────────────────────────────────────────────────

function ChartRenderer({ segment }: { segment: ParsedSegment }) {
  const { chartData = [], chartType = 'bar', chartConfig } = segment
  if (chartData.length === 0 || !chartConfig) return null

  const { xKey, yKeys } = chartConfig

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
      <ResponsiveContainer width="100%" height={220}>
        {chartType === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }: { name: string; percent: number }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: '#64748b' }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
