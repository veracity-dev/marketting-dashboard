'use client'

import { useEffect } from 'react'
import { Bot } from 'lucide-react'
import { ChatSessionList } from './ChatSessionList'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'

export function ChatView() {
  const {
    sessions, activeSessionId, messages,
    isLoading, isStreaming, error,
    loadSessions, createSession, deleteSession, selectSession, sendMessage,
  } = useChat()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Session sidebar */}
      <div className="w-[200px] shrink-0">
        <ChatSessionList
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={selectSession}
          onDelete={deleteSession}
          onCreate={createSession}
        />
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden border-l border-slate-800">
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
              <div className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <ChatInput
              onSend={sendMessage}
              disabled={isStreaming || !activeSessionId}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20">
              <Bot size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-200">Marketing AI Agent</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Ask questions about your GA4, Search Console, and Semrush data.
                I can query the database and visualize results.
              </p>
            </div>
            <button
              onClick={createSession}
              className="mt-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
