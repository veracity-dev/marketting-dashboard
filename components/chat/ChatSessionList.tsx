'use client'

import { useState } from 'react'
import { MessageSquare, Trash2, Plus } from 'lucide-react'
import { cn, fmtRelativeTime } from '@/lib/utils'
import type { ChatSession } from '@/lib/types'

interface Props {
  sessions: ChatSession[]
  activeId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onCreate: () => void
}

export function ChatSessionList({ sessions, activeId, onSelect, onDelete, onCreate }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      onDelete(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      // Auto-clear confirm after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="flex h-full flex-col border-r border-slate-800">
      {/* New Chat button */}
      <button
        onClick={onCreate}
        className="flex items-center gap-2 border-b border-slate-800 px-3 py-2.5 text-xs font-medium text-indigo-400 hover:bg-slate-800/50 transition-colors"
      >
        <Plus size={14} />
        New Chat
      </button>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sessions.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-600">No conversations yet</p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'group flex cursor-pointer items-start gap-2 border-b border-slate-800/50 px-3 py-2.5 transition-colors hover:bg-slate-800/50',
              s.id === activeId && 'bg-slate-800'
            )}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-300">{s.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">
                {fmtRelativeTime(s.updated_at)}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(s.id, e)}
              className={cn(
                'shrink-0 rounded p-1 transition-colors',
                confirmDelete === s.id
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400'
              )}
              title={confirmDelete === s.id ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
