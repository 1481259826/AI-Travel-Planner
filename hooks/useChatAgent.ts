/**
 * useChatAgent Hook
 * 管理对话状态和 SSE 流式通信
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { auth } from '@/lib/supabase'
import type {
  ChatMessage,
  ChatStreamEvent,
  ChatSessionListItem,
  ToolCall,
} from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

export interface UseChatAgentOptions {
  /** 初始会话 ID */
  sessionId?: string
  /** 关联的行程 ID */
  tripId?: string
  /** 自动加载历史消息 */
  autoLoadHistory?: boolean
}

export interface UseChatAgentReturn {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在生成回复 */
  isGenerating: boolean
  /** 错误信息 */
  error: string | null
  /** 当前会话 ID */
  sessionId: string | null
  /** 当前正在执行的工具调用 */
  currentToolCall: ToolCall | null
  /** 流式生成中的文本 */
  streamingContent: string
  /** 发送消息 */
  sendMessage: (content: string) => Promise<void>
  /** 重置对话 */
  reset: () => void
  /** 加载历史消息 */
  loadHistory: (sessionId: string) => Promise<void>
  /** 切换会话 */
  switchSession: (sessionId: string) => Promise<void>
  /** 创建新会话 */
  createNewSession: () => void
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useChatAgent(options: UseChatAgentOptions = {}): UseChatAgentReturn {
  const { sessionId: initialSessionId, tripId, autoLoadHistory = true } = options

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null)
  const [streamingContent, setStreamingContent] = useState('')

  // 中止控制器
  const abortControllerRef = useRef<AbortController | null>(null)

  // 初始化时加载历史消息
  useEffect(() => {
    if (initialSessionId && autoLoadHistory) {
      loadHistory(initialSessionId)
    }
  }, [initialSessionId, autoLoadHistory])

  /**
   * 加载历史消息
   */
  const loadHistory = useCallback(async (targetSessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      const response = await fetch(`/api/chat/sessions/${targetSessionId}/messages`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '加载消息历史失败')
      }

      const data = await response.json()
      setMessages(data.data.messages || [])
      setSessionId(targetSessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载消息历史失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 切换会话
   */
  const switchSession = useCallback(async (newSessionId: string) => {
    // 中止当前生成
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setMessages([])
    setStreamingContent('')
    setCurrentToolCall(null)
    setError(null)
    setSessionId(newSessionId)

    await loadHistory(newSessionId)
  }, [loadHistory])

  /**
   * 创建新会话
   */
  const createNewSession = useCallback(() => {
    // 中止当前生成
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setMessages([])
    setStreamingContent('')
    setCurrentToolCall(null)
    setError(null)
    setSessionId(null)
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    setError(null)
    setIsGenerating(true)
    setStreamingContent('')
    setCurrentToolCall(null)

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    // 立即添加用户消息到列表
    setMessages((prev) => [...prev, userMessage])

    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      // 创建中止控制器
      abortControllerRef.current = new AbortController()

      // 发送请求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: content.trim(),
          trip_id: tripId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '发送消息失败')
      }

      // 处理 SSE 流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let newSessionId = sessionId
      let messageId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const event: ChatStreamEvent = JSON.parse(line.slice(6))

            switch (event.type) {
              case 'start':
                if (event.sessionId) {
                  newSessionId = event.sessionId
                  setSessionId(event.sessionId)
                }
                if (event.messageId) {
                  messageId = event.messageId
                }
                break

              case 'delta':
                if (event.delta) {
                  fullContent += event.delta
                  setStreamingContent(fullContent)
                }
                break

              case 'tool_call':
                if (event.toolCall) {
                  setCurrentToolCall(event.toolCall)
                }
                break

              case 'tool_result':
                setCurrentToolCall(null)
                break

              case 'error':
                throw new Error(event.error || '对话处理失败')

              case 'end':
                // 添加助手消息
                const assistantMessage: ChatMessage = {
                  id: messageId || `msg-${Date.now()}`,
                  role: 'assistant',
                  content: fullContent,
                  timestamp: Date.now(),
                }
                setMessages((prev) => [...prev, assistantMessage])
                setStreamingContent('')
                break
            }
          } catch (parseError) {
            console.error('解析 SSE 事件失败:', parseError)
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户中止，不显示错误
        return
      }
      setError(err instanceof Error ? err.message : '发送消息失败')
    } finally {
      setIsGenerating(false)
      setCurrentToolCall(null)
      abortControllerRef.current = null
    }
  }, [sessionId, tripId])

  /**
   * 重置对话
   */
  const reset = useCallback(() => {
    // 中止当前生成
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setMessages([])
    setStreamingContent('')
    setCurrentToolCall(null)
    setError(null)
    setSessionId(null)
    setIsGenerating(false)
    setIsLoading(false)
  }, [])

  // 组件卸载时中止请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    isGenerating,
    error,
    sessionId,
    currentToolCall,
    streamingContent,
    sendMessage,
    reset,
    loadHistory,
    switchSession,
    createNewSession,
  }
}

// ============================================================================
// 会话列表 Hook
// ============================================================================

export interface UseChatSessionsReturn {
  /** 会话列表 */
  sessions: ChatSessionListItem[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 刷新会话列表 */
  refresh: () => Promise<void>
  /** 删除会话 */
  deleteSession: (sessionId: string) => Promise<void>
  /** 创建新会话 */
  createSession: (tripId?: string) => Promise<string | null>
}

export function useChatSessions(): UseChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 刷新会话列表
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      const response = await fetch('/api/chat/sessions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '加载会话列表失败')
      }

      const data = await response.json()
      setSessions(data.data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载会话列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 删除会话
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '删除会话失败')
      }

      // 从列表中移除
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败')
      throw err
    }
  }, [])

  /**
   * 创建新会话
   */
  const createSession = useCallback(async (tripId?: string): Promise<string | null> => {
    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tripId,
          title: '新对话',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '创建会话失败')
      }

      const data = await response.json()
      const newSession = data.data

      // 添加到列表
      setSessions((prev) => [
        {
          id: newSession.id,
          title: newSession.title,
          tripId: newSession.tripId,
          status: newSession.status,
          createdAt: newSession.createdAt,
          updatedAt: newSession.updatedAt,
        },
        ...prev,
      ])

      return newSession.id
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建会话失败')
      return null
    }
  }, [])

  // 初始化时加载
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    sessions,
    isLoading,
    error,
    refresh,
    deleteSession,
    createSession,
  }
}
