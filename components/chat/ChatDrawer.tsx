'use client'

import { useEffect } from 'react'
import { X, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatSessionList } from './ChatSessionList'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ChatDrawer({ isOpen, onClose }: Props) {
  const {
    sessions, activeSessionId, messages,
    isLoading, isStreaming, error,
    loadSessions, createSession, deleteSession, selectSession, sendMessage,
  } = useChat()

  // Load sessions when drawer opens
  useEffect(() => {
    if (isOpen) loadSessions()
  }, [isOpen, loadSessions])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col',
          'border-l border-slate-800 bg-slate-950 shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20">
              <Bot size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">AI Agent</h2>
              <p className="text-[10px] text-slate-500">Chat with your marketing data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: sidebar + messages */}
        <div className="flex flex-1 overflow-hidden">
          {/* Session sidebar */}
          <div className="w-[160px] shrink-0">
            <ChatSessionList
              sessions={sessions}
              activeId={activeSessionId}
              onSelect={selectSession}
              onDelete={deleteSession}
              onCreate={createSession}
            />
          </div>

          {/* Chat area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {activeSessionId ? (
              <>
                {isLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>
                ) : (
                  <ChatMessageList messages={messages} isStreaming={isStreaming} />
                )}

                {error && (
                  <div className="mx-3 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <ChatInput
                  onSend={sendMessage}
                  disabled={isStreaming || !activeSessionId}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
                <Bot size={32} className="text-slate-700" />
                <p className="text-xs text-slate-500">
                  Select a conversation or start a new chat
                </p>
                <button
                  onClick={createSession}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
