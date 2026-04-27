'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatSession, ChatMessage } from '@/lib/types'

interface UseChatReturn {
  sessions: ChatSession[]
  activeSessionId: number | null
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  loadSessions: () => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (id: number) => Promise<void>
  selectSession: (id: number) => Promise<void>
  sendMessage: (content: string) => Promise<void>
}

export function useChat(): UseChatReturn {
  const [sessions, setSessions]             = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages]             = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading]           = useState(false)
  const [isStreaming, setIsStreaming]        = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const abortRef                            = useRef<AbortController | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions')
      if (!res.ok) throw new Error('Failed to load sessions')
      const data: ChatSession[] = await res.json()
      setSessions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    }
  }, [])

  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const session: ChatSession = await res.json()
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session')
    }
  }, [])

  const deleteSession = useCallback(async (id: number) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSessionId === id) {
        setActiveSessionId(null)
        setMessages([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete session')
    }
  }, [activeSessionId])

  const selectSession = useCallback(async (id: number) => {
    setActiveSessionId(id)
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/chat/sessions/${id}/messages`)
      if (!res.ok) throw new Error('Failed to load messages')
      const data: ChatMessage[] = await res.json()
      setMessages(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeSessionId || isStreaming) return

    setError(null)

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSessionId,
      role: 'user',
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    // Add placeholder assistant message
    const tempAssistantMsg: ChatMessage = {
      id: Date.now() + 1,
      session_id: activeSessionId,
      role: 'assistant',
      content: '',
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempAssistantMsg])
    setIsStreaming(true)

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSessionId, message: content }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('Chat request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload) continue

          try {
            const event = JSON.parse(payload)

            if (event.type === 'status') {
              // Update the placeholder with thinking status
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: '', metadata: { status: event.content } }
                }
                return updated
              })
            } else if (event.type === 'message') {
              // Replace placeholder with actual response
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: event.content, metadata: {} }
                }
                return updated
              })
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: event.content, metadata: { error: true } }
                }
                return updated
              })
            }
            // 'done' type — streaming complete
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Update session title in sidebar (it may have changed server-side)
      const sessionsRes = await fetch('/api/chat/sessions')
      if (sessionsRes.ok) {
        const updated: ChatSession[] = await sessionsRes.json()
        setSessions(updated)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Failed to send message')
        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantMsg.id))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [activeSessionId, isStreaming])

  return {
    sessions, activeSessionId, messages,
    isLoading, isStreaming, error,
    loadSessions, createSession, deleteSession, selectSession, sendMessage,
  }
}
