'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-slate-800 bg-slate-950 p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your marketing data..."
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2',
          'text-sm text-slate-200 placeholder-slate-500',
          'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          'disabled:opacity-50',
          'scrollbar-thin'
        )}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          value.trim() && !disabled
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-slate-800 text-slate-600'
        )}
      >
        <SendHorizontal size={16} />
      </button>
    </div>
  )
}
