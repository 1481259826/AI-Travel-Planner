/**
 * useHITLWorkflow - Human-in-the-Loop 工作流 Hook
 * 用于处理 HITL 工作流的启动、中断和恢复
 */

import { useState, useCallback, useRef } from 'react'
import type { TripFormData, Itinerary } from '@/types'
import type { GenerationStage } from '@/components/ProgressModal'
import type {
  HITLInterruptType,
  ItineraryReviewOptions,
  BudgetDecisionOptions,
  FinalConfirmOptions,
  HITLUserDecision,
} from '@/lib/agents/state-hitl'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * HITL SSE 事件类型
 */
interface HITLSSEEvent {
  type: 'start' | 'node_start' | 'node_complete' | 'progress' | 'interrupt' | 'resumed' | 'error' | 'complete'
  threadId?: string
  node?: string
  nodeName?: string
  progress?: number
  message?: string
  interruptType?: HITLInterruptType
  interruptData?: {
    options: ItineraryReviewOptions | BudgetDecisionOptions | FinalConfirmOptions
    preview?: unknown
  }
  data?: {
    nodes?: Array<{ id: string; name: string; hitlEnabled?: boolean }>
    trip_id?: string
    itinerary?: Itinerary
    budgetResult?: unknown
  }
  timestamp: number
}

/**
 * 中断状态数据
 */
export interface InterruptState {
  threadId: string
  interruptType: HITLInterruptType
  message: string
  options: ItineraryReviewOptions | BudgetDecisionOptions | FinalConfirmOptions
}

/**
 * 工作流节点定义
 */
interface WorkflowNode {
  id: string
  name: string
  description: string
  hitlEnabled?: boolean
}

/**
 * Hook 返回类型
 */
export interface UseHITLWorkflowReturn {
  /** 是否正在生成 */
  isGenerating: boolean
  /** 当前进度 (0-100) */
  progress: number
  /** 生成阶段列表 */
  stages: GenerationStage[]
  /** 当前阶段索引 */
  currentStage: number
  /** 错误信息 */
  error: string | null
  /** 生成结果 */
  result: { trip_id: string; itinerary: Itinerary } | null
  /** 是否处于中断状态 */
  isInterrupted: boolean
  /** 中断数据 */
  interruptData: InterruptState | null
  /** 是否正在恢复 */
  isResuming: boolean
  /** 开始生成 - 使用 HITL 工作流 */
  startGeneration: (formData: TripFormData, accessToken: string) => Promise<{ trip_id: string; itinerary: Itinerary } | null>
  /** 恢复工作流 - 提交用户决策 */
  resumeWorkflow: (decision: HITLUserDecision, accessToken: string) => Promise<{ trip_id: string; itinerary: Itinerary } | null>
  /** 重置状态 */
  reset: () => void
}

// ============================================================================
// 默认工作流节点
// ============================================================================

const DEFAULT_HITL_WORKFLOW_NODES: WorkflowNode[] = [
  { id: 'weather_scout', name: '天气分析', description: '获取目的地天气预报并生成策略建议', hitlEnabled: false },
  { id: 'itinerary_planner', name: '行程规划', description: '根据用户需求和天气策略生成行程框架', hitlEnabled: true },
  { id: 'attraction_enricher', name: '景点详情', description: '为景点添加门票、开放时间、评分等详细信息', hitlEnabled: false },
  { id: 'accommodation_agent', name: '住宿推荐', description: '推荐合适的酒店住宿', hitlEnabled: false },
  { id: 'transport_agent', name: '交通规划', description: '计算景点间的交通路线和费用', hitlEnabled: false },
  { id: 'dining_agent', name: '餐饮推荐', description: '推荐当地特色餐厅', hitlEnabled: false },
  { id: 'budget_critic', name: '预算审计', description: '审核总成本是否在预算范围内', hitlEnabled: true },
  { id: 'finalize', name: '生成行程', description: '整合所有信息生成完整行程', hitlEnabled: false },
]

/**
 * 将工作流节点转换为生成阶段
 */
function nodesToStages(nodes: WorkflowNode[]): GenerationStage[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    description: node.description,
    progress: 0,
    status: 'pending' as const,
  }))
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useHITLWorkflow(): UseHITLWorkflowReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stages, setStages] = useState<GenerationStage[]>(() => nodesToStages(DEFAULT_HITL_WORKFLOW_NODES))
  const [currentStage, setCurrentStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ trip_id: string; itinerary: Itinerary } | null>(null)

  // HITL 特有状态
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [interruptData, setInterruptData] = useState<InterruptState | null>(null)
  const [isResuming, setIsResuming] = useState(false)

  // 保存 access token 和 form data 用于恢复
  const accessTokenRef = useRef<string>('')
  const formDataRef = useRef<TripFormData | null>(null)

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsGenerating(false)
    setProgress(0)
    setStages(nodesToStages(DEFAULT_HITL_WORKFLOW_NODES))
    setCurrentStage(0)
    setError(null)
    setResult(null)
    setIsInterrupted(false)
    setInterruptData(null)
    setIsResuming(false)
    accessTokenRef.current = ''
    formDataRef.current = null
  }, [])

  /**
   * 更新阶段状态
   */
  const updateStage = useCallback((nodeId: string, status: GenerationStage['status'], nodeProgress: number = 0) => {
    setStages((prev) => {
      const newStages = prev.map((stage) => {
        if (stage.id === nodeId) {
          return { ...stage, status, progress: nodeProgress }
        }
        return stage
      })
      return newStages
    })

    const stageIndex = stages.findIndex((s) => s.id === nodeId)
    if (stageIndex >= 0) {
      setCurrentStage(stageIndex)
    }
  }, [stages])

  /**
   * 处理 SSE 事件流
   */
  const handleSSEStream = useCallback(async (
    response: Response,
    onComplete: (result: { trip_id: string; itinerary: Itinerary }) => void,
    onInterrupt: (data: InterruptState) => void,
    onError: (error: string) => void
  ) => {
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
        if (line.startsWith('data: ')) {
          try {
            const event: HITLSSEEvent = JSON.parse(line.slice(6))

            switch (event.type) {
              case 'start':
                if (event.data?.nodes) {
                  const nodes = event.data.nodes.map((n) => ({
                    ...n,
                    description: DEFAULT_HITL_WORKFLOW_NODES.find((d) => d.id === n.id)?.description || '',
                  }))
                  setStages(nodesToStages(nodes))
                }
                break

              case 'node_complete':
                if (event.node) {
                  updateStage(event.node, 'completed', 100)
                }
                if (typeof event.progress === 'number') {
                  setProgress(event.progress)
                }
                break

              case 'progress':
                if (typeof event.progress === 'number') {
                  setProgress(event.progress)
                }
                break

              case 'interrupt':
                // 工作流中断，等待用户输入
                if (event.interruptType && event.interruptData) {
                  const interruptState: InterruptState = {
                    threadId: event.threadId || '',
                    interruptType: event.interruptType,
                    message: event.message || '请确认或调整',
                    options: event.interruptData.options,
                  }
                  onInterrupt(interruptState)
                }
                return // 中断时停止处理流

              case 'resumed':
                // 工作流已恢复
                setIsResuming(false)
                break

              case 'error':
                onError(event.message || '发生未知错误')
                return

              case 'complete':
                setProgress(100)
                setStages((prev) =>
                  prev.map((stage) => ({
                    ...stage,
                    status: 'completed' as const,
                    progress: 100,
                  }))
                )
                if (event.data?.trip_id && event.data?.itinerary) {
                  onComplete({
                    trip_id: event.data.trip_id,
                    itinerary: event.data.itinerary,
                  })
                }
                break
            }
          } catch (e) {
            console.error('解析 SSE 事件失败:', e)
          }
        }
      }
    }
  }, [updateStage])

  /**
   * 开始生成 - 使用 HITL 工作流
   */
  const startGeneration = useCallback(async (
    formData: TripFormData,
    accessToken: string
  ): Promise<{ trip_id: string; itinerary: Itinerary } | null> => {
    reset()
    setIsGenerating(true)
    accessTokenRef.current = accessToken
    formDataRef.current = formData

    try {
      const response = await fetch('/api/v2/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          form_data: formData,
          enable_hitl: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '请求失败')
      }

      return new Promise((resolve, reject) => {
        handleSSEStream(
          response,
          // onComplete
          (result) => {
            setResult(result)
            setIsGenerating(false)
            resolve(result)
          },
          // onInterrupt
          (interruptState) => {
            setIsInterrupted(true)
            setInterruptData(interruptState)
            setIsGenerating(false)
            resolve(null) // 返回 null 表示工作流中断
          },
          // onError
          (errorMsg) => {
            setError(errorMsg)
            setIsGenerating(false)
            reject(new Error(errorMsg))
          }
        )
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成行程时发生未知错误'
      setError(errorMessage)
      setIsGenerating(false)
      throw err
    }
  }, [reset, handleSSEStream])

  /**
   * 恢复工作流 - 提交用户决策
   */
  const resumeWorkflow = useCallback(async (
    decision: HITLUserDecision,
    accessToken: string
  ): Promise<{ trip_id: string; itinerary: Itinerary } | null> => {
    if (!interruptData?.threadId) {
      throw new Error('无法恢复工作流：缺少线程 ID')
    }

    setIsResuming(true)
    setError(null)

    // 如果用户取消，直接重置
    if (decision.type === 'cancel') {
      reset()
      return null
    }

    try {
      const response = await fetch('/api/v2/workflow/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          thread_id: interruptData.threadId,
          decision,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '恢复工作流失败')
      }

      // 清除中断状态，恢复生成状态
      setIsInterrupted(false)
      setInterruptData(null)
      setIsGenerating(true)

      return new Promise((resolve, reject) => {
        handleSSEStream(
          response,
          // onComplete
          (result) => {
            setResult(result)
            setIsGenerating(false)
            setIsResuming(false)
            resolve(result)
          },
          // onInterrupt - 可能再次中断（如预算审计）
          (interruptState) => {
            setIsInterrupted(true)
            setInterruptData(interruptState)
            setIsGenerating(false)
            setIsResuming(false)
            resolve(null)
          },
          // onError
          (errorMsg) => {
            setError(errorMsg)
            setIsGenerating(false)
            setIsResuming(false)
            reject(new Error(errorMsg))
          }
        )
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复工作流时发生未知错误'
      setError(errorMessage)
      setIsResuming(false)
      throw err
    }
  }, [interruptData, reset, handleSSEStream])

  return {
    isGenerating,
    progress,
    stages,
    currentStage,
    error,
    result,
    isInterrupted,
    interruptData,
    isResuming,
    startGeneration,
    resumeWorkflow,
    reset,
  }
}

export default useHITLWorkflow
