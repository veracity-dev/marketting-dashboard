'use client'

import { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMessageContent } from './ChatMessageContent'
import type { ChatMessage } from '@/lib/types'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
}

export function ChatMessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20">
          <Bot size={24} className="text-indigo-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-300">Marketing AI Agent</h3>
        <p className="max-w-[260px] text-xs text-slate-500">
          Ask questions about your GA4, Search Console, and Semrush data. I can query the database and visualize results.
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            'What were the total sessions last week?',
            'Top 5 keywords by clicks',
            'Compare organic traffic across months',
          ].map((q) => (
            <p key={q} className="text-xs text-slate-600 italic">
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
      <div className="space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const isThinking = !isUser && !msg.content && msg.metadata?.status

          return (
            <div key={msg.id} className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  isUser ? 'bg-indigo-600' : 'bg-slate-700'
                )}
              >
                {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-slate-300" />}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2',
                  isUser
                    ? 'bg-indigo-600 text-sm text-white'
                    : 'bg-slate-800 text-sm text-slate-300'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ChatMessageContent
                    content={msg.content}
                    isThinking={!!isThinking}
                    thinkingStatus={isThinking ? String(msg.metadata.status) : undefined}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
