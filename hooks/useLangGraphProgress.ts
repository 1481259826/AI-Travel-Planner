/**
 * LangGraph 工作流进度监听 Hook
 * 使用 SSE (Server-Sent Events) 实时监听工作流执行进度
 */

import { useState, useCallback, useRef } from 'react'
import type { TripFormData, Itinerary } from '@/types'
import type { GenerationStage } from '@/components/ProgressModal'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * SSE 事件类型
 */
interface SSEEvent {
  type: 'start' | 'node_start' | 'node_complete' | 'progress' | 'error' | 'complete'
  node?: string
  nodeName?: string
  progress?: number
  message?: string
  data?: {
    nodes?: Array<{ id: string; name: string }>
    trip_id?: string
    itinerary?: Itinerary
    budgetResult?: unknown
  }
  timestamp: number
}

/**
 * 工作流节点定义
 */
interface WorkflowNode {
  id: string
  name: string
  description: string
}

/**
 * Hook 返回类型
 */
interface UseLangGraphProgressReturn {
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
  /** 开始生成 */
  startGeneration: (formData: TripFormData, accessToken: string) => Promise<void>
  /** 重置状态 */
  reset: () => void
}

// ============================================================================
// 默认工作流节点（用于初始化）
// ============================================================================

const DEFAULT_WORKFLOW_NODES: WorkflowNode[] = [
  { id: 'weather_scout', name: '天气分析', description: '获取目的地天气预报并生成策略建议' },
  { id: 'itinerary_planner', name: '行程规划', description: '根据用户需求和天气策略生成行程框架' },
  { id: 'accommodation_agent', name: '住宿推荐', description: '推荐合适的酒店住宿' },
  { id: 'transport_agent', name: '交通规划', description: '计算景点间的交通路线和费用' },
  { id: 'dining_agent', name: '餐饮推荐', description: '推荐当地特色餐厅' },
  { id: 'budget_critic', name: '预算审计', description: '审核总成本是否在预算范围内' },
  { id: 'finalize', name: '生成行程', description: '整合所有信息生成完整行程' },
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

/**
 * LangGraph 工作流进度监听 Hook
 */
export function useLangGraphProgress(): UseLangGraphProgressReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stages, setStages] = useState<GenerationStage[]>(() => nodesToStages(DEFAULT_WORKFLOW_NODES))
  const [currentStage, setCurrentStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ trip_id: string; itinerary: Itinerary } | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsGenerating(false)
    setProgress(0)
    setStages(nodesToStages(DEFAULT_WORKFLOW_NODES))
    setCurrentStage(0)
    setError(null)
    setResult(null)

    // 关闭 EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
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

    // 更新当前阶段索引
    const stageIndex = stages.findIndex((s) => s.id === nodeId)
    if (stageIndex >= 0) {
      setCurrentStage(stageIndex)
    }
  }, [stages])

  /**
   * 开始生成
   */
  const startGeneration = useCallback(async (formData: TripFormData, accessToken: string) => {
    // 重置状态
    reset()
    setIsGenerating(true)

    try {
      // 使用 fetch + ReadableStream 替代 EventSource (支持 POST 请求)
      const response = await fetch('/api/v2/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '请求失败')
      }

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

        // 解析 SSE 数据行
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留未完成的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6))
              handleSSEEvent(event)
            } catch (e) {
              console.error('解析 SSE 事件失败:', e)
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成行程时发生未知错误'
      setError(errorMessage)
      console.error('LangGraph 工作流执行失败:', err)
    } finally {
      setIsGenerating(false)
    }

    /**
     * 处理 SSE 事件
     */
    function handleSSEEvent(event: SSEEvent) {
      switch (event.type) {
        case 'start':
          // 工作流开始，初始化阶段
          if (event.data?.nodes) {
            const nodes = event.data.nodes.map((n) => ({
              ...n,
              description: DEFAULT_WORKFLOW_NODES.find((d) => d.id === n.id)?.description || '',
            }))
            setStages(nodesToStages(nodes))
          }
          break

        case 'node_complete':
          // 节点完成
          if (event.node) {
            updateStage(event.node, 'completed', 100)
          }
          if (typeof event.progress === 'number') {
            setProgress(event.progress)
          }
          break

        case 'progress':
          // 进度更新
          if (typeof event.progress === 'number') {
            setProgress(event.progress)
          }
          break

        case 'error':
          // 错误
          setError(event.message || '生成行程时发生错误')
          // 标记当前阶段为错误
          setStages((prev) =>
            prev.map((stage, idx) => {
              if (idx === currentStage) {
                return { ...stage, status: 'error' as const }
              }
              return stage
            })
          )
          break

        case 'complete':
          // 完成
          setProgress(100)
          setStages((prev) =>
            prev.map((stage) => ({
              ...stage,
              status: 'completed' as const,
              progress: 100,
            }))
          )
          if (event.data?.trip_id && event.data?.itinerary) {
            setResult({
              trip_id: event.data.trip_id,
              itinerary: event.data.itinerary,
            })
          }
          break
      }
    }
  }, [reset, currentStage, updateStage])

  return {
    isGenerating,
    progress,
    stages,
    currentStage,
    error,
    result,
    startGeneration,
    reset,
  }
}

export default useLangGraphProgress
