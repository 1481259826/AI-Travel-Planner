/**
 * useChatAgent Hook
 * 管理对话状态和 SSE 流式通信
 * 支持对话式行程生成和行程修改预览
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { auth } from '@/lib/supabase'
import type {
  ChatMessage,
  ChatStreamEvent,
  ChatSessionListItem,
  ToolCall,
  TripFormData,
  TripFormValidation,
  TripGenerationState,
  GenerationStage,
  ModificationPreview,
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

  // 行程生成相关
  /** 行程生成状态 */
  tripGenerationState: TripGenerationState
  /** 打开表单编辑模态框 */
  openFormModal: () => void
  /** 关闭表单编辑模态框 */
  closeFormModal: () => void
  /** 更新待确认的表单数据 */
  updatePendingForm: (formData: Partial<TripFormData>) => void
  /** 开始行程生成 */
  startTripGeneration: (formData: TripFormData) => Promise<void>
  /** 取消行程生成 */
  cancelTripGeneration: () => void
  /** 重置行程生成状态 */
  resetTripGeneration: () => void

  // 行程修改预览相关
  /** 待确认的修改预览 */
  pendingModification: ModificationPreview | null
  /** 是否正在处理修改 */
  isModificationProcessing: boolean
  /** 最后一次确认成功的修改信息 */
  lastConfirmedModification: { modificationId: string; affectedDays: number[]; itinerary?: any } | null
  /** 确认修改（支持用户微调） */
  confirmModification: (modificationId: string, userAdjustments?: UserAdjustments) => Promise<void>
  /** 取消修改 */
  cancelModification: (modificationId: string) => void
  /** 清除修改预览 */
  clearModification: () => void
  /** 清除最后确认的修改信息 */
  clearLastConfirmedModification: () => void
}

/** 用户微调数据类型 */
export interface UserAdjustments {
  time_adjustments?: Array<{
    day_index: number
    activity_index: number
    new_time: string
  }>
}

// ============================================================================
// 默认工作流节点
// ============================================================================

const DEFAULT_GENERATION_STAGES: GenerationStage[] = [
  { id: 'weather_scout', name: '天气分析', status: 'pending' },
  { id: 'itinerary_planner', name: '行程规划', status: 'pending' },
  { id: 'accommodation', name: '住宿推荐', status: 'pending' },
  { id: 'transport', name: '交通规划', status: 'pending' },
  { id: 'dining', name: '餐饮推荐', status: 'pending' },
  { id: 'budget_critic', name: '预算审计', status: 'pending' },
  { id: 'finalize', name: '生成行程', status: 'pending' },
]

// ============================================================================
// 初始行程生成状态
// ============================================================================

const initialTripGenerationState: TripGenerationState = {
  pendingForm: null,
  formValidation: null,
  isModalOpen: false,
  generation: {
    isGenerating: false,
    progress: 0,
    stages: [],
    currentStage: 0,
    error: null,
    result: null,
  },
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

  // 行程生成状态
  const [tripGenerationState, setTripGenerationState] = useState<TripGenerationState>(
    initialTripGenerationState
  )

  // 待自动触发生成的表单数据
  const [autoGenerateForm, setAutoGenerateForm] = useState<TripFormData | null>(null)

  // 行程修改预览状态
  const [pendingModification, setPendingModification] = useState<ModificationPreview | null>(null)
  const [isModificationProcessing, setIsModificationProcessing] = useState(false)
  // 最后一次确认成功的修改信息（用于触发页面刷新和滚动）
  const [lastConfirmedModification, setLastConfirmedModification] = useState<{
    modificationId: string
    affectedDays: number[]
    itinerary?: any
  } | null>(null)

  // 中止控制器
  const abortControllerRef = useRef<AbortController | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)

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
                // 检查是否是 prepare_trip_form 的结果
                if (event.toolResult && typeof event.toolResult === 'object') {
                  const result = event.toolResult as any
                  // 检查是否有 formData 和 validation（来自 prepare_trip_form）
                  if (result.formData && result.validation) {
                    // 更新行程生成状态
                    setTripGenerationState((prev) => ({
                      ...prev,
                      pendingForm: {
                        destination: result.formData.destination,
                        startDate: result.formData.startDate,
                        endDate: result.formData.endDate,
                        budget: result.formData.budget,
                        travelers: result.formData.travelers,
                        origin: result.formData.origin,
                        preferences: result.formData.preferences,
                        accommodation_preference: result.formData.accommodation_preference,
                        transport_preference: result.formData.transport_preference,
                        special_requirements: result.formData.special_requirements,
                      },
                      formValidation: result.validation,
                    }))
                  }
                  // 检查是否是 confirm_and_generate_trip 的结果
                  if (result.action === 'trigger_generation' && result.formData) {
                    // 设置待生成表单数据，由 effect 触发实际生成
                    setAutoGenerateForm(result.formData as TripFormData)
                  }
                  // 检查是否是 prepare_itinerary_modification 的结果（修改预览）
                  if (result.preview && result.preview.id && result.preview.operation) {
                    // 设置修改预览
                    setPendingModification(result.preview as ModificationPreview)
                  }
                  // 检查是否是 confirm_itinerary_modification 的结果（修改确认成功）
                  if (result.success && result.modificationId) {
                    // 设置最后确认的修改信息（包含受影响的天数，用于页面刷新和滚动）
                    setLastConfirmedModification({
                      modificationId: result.modificationId,
                      affectedDays: result.affectedDays || [],
                      itinerary: result.itinerary,
                    })
                    // 清除修改预览
                    setPendingModification(null)
                    setIsModificationProcessing(false)
                  }
                }
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
    setTripGenerationState(initialTripGenerationState)
    // 重置修改预览状态
    setPendingModification(null)
    setIsModificationProcessing(false)
    setLastConfirmedModification(null)
  }, [])

  // ==========================================================================
  // 行程生成相关方法
  // ==========================================================================

  /**
   * 打开表单编辑模态框
   */
  const openFormModal = useCallback(() => {
    setTripGenerationState((prev) => ({
      ...prev,
      isModalOpen: true,
    }))
  }, [])

  /**
   * 关闭表单编辑模态框
   */
  const closeFormModal = useCallback(() => {
    setTripGenerationState((prev) => ({
      ...prev,
      isModalOpen: false,
    }))
  }, [])

  /**
   * 更新待确认的表单数据
   */
  const updatePendingForm = useCallback((formData: Partial<TripFormData>) => {
    // 验证表单数据
    const validation = validateTripForm(formData)

    setTripGenerationState((prev) => ({
      ...prev,
      pendingForm: formData,
      formValidation: validation,
    }))
  }, [])

  /**
   * 验证表单数据（本地验证）
   */
  const validateTripForm = (formData: Partial<TripFormData>): TripFormValidation => {
    const requiredFields = ['destination', 'startDate', 'endDate', 'budget', 'travelers'] as const
    const optionalFields = ['origin', 'preferences', 'accommodation_preference', 'transport_preference', 'special_requirements'] as const

    const fieldLabels: Record<string, string> = {
      destination: '目的地',
      startDate: '开始日期',
      endDate: '结束日期',
      budget: '预算',
      travelers: '出行人数',
      origin: '出发地',
      preferences: '旅行偏好',
      accommodation_preference: '住宿偏好',
      transport_preference: '交通偏好',
      special_requirements: '特殊要求',
    }

    const missingRequired: string[] = []
    const missingOptional: string[] = []

    for (const field of requiredFields) {
      const value = formData[field]
      if (value === undefined || value === null || value === '') {
        missingRequired.push(fieldLabels[field])
      }
    }

    for (const field of optionalFields) {
      const value = formData[field]
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        missingOptional.push(fieldLabels[field])
      }
    }

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      missingOptional,
    }
  }

  /**
   * 开始行程生成
   */
  const startTripGeneration = useCallback(async (formData: TripFormData) => {
    // 初始化生成状态
    setTripGenerationState((prev) => ({
      ...prev,
      isModalOpen: false,
      generation: {
        isGenerating: true,
        progress: 0,
        stages: DEFAULT_GENERATION_STAGES.map((s) => ({ ...s, status: 'pending' as const })),
        currentStage: 0,
        error: null,
        result: null,
      },
    }))

    try {
      const { data: { session } } = await auth.getSession()
      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      // 创建中止控制器
      generationAbortRef.current = new AbortController()

      // 发送生成请求
      const response = await fetch('/api/chat/generate-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          form_data: formData,
          session_id: sessionId,
        }),
        signal: generationAbortRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '行程生成请求失败')
      }

      // 处理 SSE 流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const event = JSON.parse(line.slice(6))

            switch (event.type) {
              case 'start':
                // 更新会话 ID（如果有）
                if (event.data?.sessionId) {
                  setSessionId(event.data.sessionId)
                }
                break

              case 'node_complete':
                // 更新节点状态
                setTripGenerationState((prev) => {
                  const newStages = prev.generation.stages.map((stage) => {
                    if (stage.id === event.node) {
                      return { ...stage, status: 'completed' as const, progress: 100 }
                    }
                    return stage
                  })

                  // 设置下一个节点为 running
                  const completedIndex = newStages.findIndex((s) => s.id === event.node)
                  if (completedIndex >= 0 && completedIndex < newStages.length - 1) {
                    newStages[completedIndex + 1] = {
                      ...newStages[completedIndex + 1],
                      status: 'running' as const,
                    }
                  }

                  return {
                    ...prev,
                    generation: {
                      ...prev.generation,
                      progress: event.progress || prev.generation.progress,
                      stages: newStages,
                      currentStage: completedIndex + 1,
                    },
                  }
                })
                break

              case 'progress':
                setTripGenerationState((prev) => ({
                  ...prev,
                  generation: {
                    ...prev.generation,
                    progress: event.progress || prev.generation.progress,
                  },
                }))
                break

              case 'error':
                throw new Error(event.message || '生成过程中发生错误')

              case 'complete':
                // 生成完成
                setTripGenerationState((prev) => ({
                  ...prev,
                  pendingForm: null,
                  formValidation: null,
                  generation: {
                    ...prev.generation,
                    isGenerating: false,
                    progress: 100,
                    stages: prev.generation.stages.map((s) => ({
                      ...s,
                      status: 'completed' as const,
                      progress: 100,
                    })),
                    result: {
                      tripId: event.data?.trip_id,
                      destination: event.data?.destination,
                    },
                  },
                }))

                // 添加完成消息到对话
                const completionMessage: ChatMessage = {
                  id: `completion-${Date.now()}`,
                  role: 'assistant',
                  content: `🎉 行程生成完成！您的 ${event.data?.destination || ''} ${event.data?.total_days || ''}日游行程已准备就绪。`,
                  timestamp: Date.now(),
                  metadata: {
                    tripContext: {
                      tripId: event.data?.trip_id,
                      destination: event.data?.destination,
                    },
                  },
                }
                setMessages((prev) => [...prev, completionMessage])
                break
            }
          } catch (parseError) {
            console.error('解析生成事件失败:', parseError)
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户中止
        setTripGenerationState((prev) => ({
          ...prev,
          generation: {
            ...prev.generation,
            isGenerating: false,
            error: '生成已取消',
          },
        }))
        return
      }

      const errorMessage = err instanceof Error ? err.message : '行程生成失败'
      setTripGenerationState((prev) => ({
        ...prev,
        generation: {
          ...prev.generation,
          isGenerating: false,
          error: errorMessage,
          stages: prev.generation.stages.map((s, i) => {
            if (s.status === 'running') {
              return { ...s, status: 'error' as const }
            }
            return s
          }),
        },
      }))
    } finally {
      generationAbortRef.current = null
    }
  }, [sessionId])

  /**
   * 取消行程生成
   */
  const cancelTripGeneration = useCallback(() => {
    if (generationAbortRef.current) {
      generationAbortRef.current.abort()
    }
  }, [])

  /**
   * 重置行程生成状态
   */
  const resetTripGeneration = useCallback(() => {
    if (generationAbortRef.current) {
      generationAbortRef.current.abort()
    }
    setTripGenerationState(initialTripGenerationState)
    setAutoGenerateForm(null)
  }, [])

  // ==========================================================================
  // 行程修改相关方法
  // ==========================================================================

  /**
   * 确认修改
   * 通过发送一条特殊消息让 AI 调用 confirm_itinerary_modification 工具
   * 支持用户微调（如时间调整）
   */
  const confirmModification = useCallback(async (modificationId: string, userAdjustments?: UserAdjustments) => {
    if (!pendingModification || pendingModification.id !== modificationId) {
      console.warn('修改预览不存在或 ID 不匹配')
      return
    }

    setIsModificationProcessing(true)

    try {
      // 构建确认消息
      let confirmMessage = `确认修改行程（修改ID：${modificationId}）`

      // 如果有用户微调，添加到消息中
      if (userAdjustments && userAdjustments.time_adjustments && userAdjustments.time_adjustments.length > 0) {
        const adjustmentsJson = JSON.stringify(userAdjustments)
        confirmMessage += `，用户微调：${adjustmentsJson}`
      }

      // 发送确认消息，触发 AI 调用确认工具
      await sendMessage(confirmMessage)
    } catch (err) {
      console.error('确认修改失败:', err)
      setError(err instanceof Error ? err.message : '确认修改失败')
      setIsModificationProcessing(false)
    }
  }, [pendingModification, sendMessage])

  /**
   * 取消修改
   */
  const cancelModification = useCallback((modificationId: string) => {
    if (pendingModification?.id === modificationId) {
      // 更新预览状态为已取消
      setPendingModification((prev) =>
        prev ? { ...prev, status: 'cancelled' } : null
      )
      // 短暂延迟后清除
      setTimeout(() => {
        setPendingModification(null)
      }, 500)
    }
  }, [pendingModification])

  /**
   * 清除修改预览
   */
  const clearModification = useCallback(() => {
    setPendingModification(null)
    setIsModificationProcessing(false)
  }, [])

  /**
   * 清除最后确认的修改信息
   */
  const clearLastConfirmedModification = useCallback(() => {
    setLastConfirmedModification(null)
  }, [])

  // 自动触发行程生成（当 confirm_and_generate_trip 工具被调用后）
  useEffect(() => {
    if (autoGenerateForm) {
      startTripGeneration(autoGenerateForm)
      setAutoGenerateForm(null)
    }
  }, [autoGenerateForm, startTripGeneration])

  // 组件卸载时中止请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (generationAbortRef.current) {
        generationAbortRef.current.abort()
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
    // 行程生成相关
    tripGenerationState,
    openFormModal,
    closeFormModal,
    updatePendingForm,
    startTripGeneration,
    cancelTripGeneration,
    resetTripGeneration,
    // 行程修改预览相关
    pendingModification,
    isModificationProcessing,
    lastConfirmedModification,
    confirmModification,
    cancelModification,
    clearModification,
    clearLastConfirmedModification,
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
