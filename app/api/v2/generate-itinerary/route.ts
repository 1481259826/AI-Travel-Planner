/**
 * API: /api/v2/generate-itinerary
 * 基于 LangGraph 多智能体系统的 AI 行程生成
 * 支持 SSE 流式响应，实时反馈 Agent 执行进度
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import {
  streamTripPlanningWorkflow,
  executeTripPlanningWorkflow,
  getWorkflowNodes,
  resetTripPlanningWorkflow,
  resetTracer,
} from '@/lib/agents'
import type { TripState } from '@/lib/agents'
import { ApiKeyClient } from '@/lib/api-keys'
import { appConfig } from '@/lib/config'
import { TripHistoryService, type TripResultSummary } from '@/lib/trip-history'
import type { TripFormData as ChatTripFormData } from '@/lib/chat/types'
import type { TripFormData, Itinerary } from '@/types'
import { ValidationError, ConfigurationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// ============================================================================
// SSE 流式响应事件类型
// ============================================================================

interface SSEEvent {
  type:
    | 'start' // 工作流开始
    | 'node_start' // 节点开始执行
    | 'node_complete' // 节点执行完成
    | 'progress' // 进度更新
    | 'error' // 错误
    | 'complete' // 工作流完成
  node?: string // 当前节点
  nodeName?: string // 节点显示名称
  progress?: number // 进度百分比 (0-100)
  message?: string // 消息
  data?: unknown // 附加数据
  timestamp: number
}

/**
 * 发送 SSE 事件
 */
function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: SSEEvent
) {
  const data = JSON.stringify(event)
  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
}

/**
 * 获取节点的显示名称
 */
function getNodeDisplayName(nodeId: string): string {
  const nodes = getWorkflowNodes()
  const node = nodes.find((n) => n.id === nodeId)
  return node?.name || nodeId
}

/**
 * 计算当前进度百分比
 */
function calculateProgress(currentNodeIndex: number, totalNodes: number): number {
  return Math.round((currentNodeIndex / totalNodes) * 100)
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 确保用户 profile 存在
 */
async function ensureUserProfile(supabase: any, userId: string, email?: string): Promise<void> {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingProfile) {
    logger.info('创建用户 profile', { userId })

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email: email || '',
      name: email?.split('@')[0] || 'User',
    })

    if (profileError) {
      logger.error('创建 profile 失败', profileError as Error)
      throw new ConfigurationError('无法创建用户配置，请检查数据库 RLS 策略')
    }
  }
}

/**
 * 保存行程到数据库
 */
async function saveTripToDatabase(
  supabase: any,
  userId: string,
  formData: TripFormData,
  itinerary: Itinerary
) {
  const tripData: any = {
    user_id: userId,
    destination: formData.destination,
    start_date: formData.start_date,
    end_date: formData.end_date,
    budget: formData.budget,
    travelers: formData.travelers,
    adult_count: formData.adult_count,
    child_count: formData.child_count,
    preferences: formData.preferences,
    itinerary,
    status: 'planned',
  }

  // 添加可选字段
  if (formData.origin) tripData.origin = formData.origin
  if (formData.start_time) tripData.start_time = formData.start_time
  if (formData.end_time) tripData.end_time = formData.end_time

  const { data: trip, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single()

  if (error) {
    logger.error('保存行程失败', error as Error)
    throw error
  }

  return trip
}

/**
 * 获取 AI 配置
 */
async function getAIConfig(
  supabase: any,
  userId: string
): Promise<{ apiKey: string; baseURL: string; model: string }> {
  // 尝试获取用户的 DeepSeek 配置
  const userApiKeyConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', supabase)

  const apiKey = userApiKeyConfig?.apiKey || appConfig.deepseek.apiKey
  const baseURL = userApiKeyConfig?.baseUrl || appConfig.deepseek.baseURL
  const model = appConfig.deepseek.model

  if (!apiKey) {
    throw new ConfigurationError(
      '未配置 DeepSeek API Key。请在"设置 → API Key 管理"中添加，或在环境变量中配置。'
    )
  }

  logger.info('使用 AI 配置', {
    source: userApiKeyConfig ? '用户自定义' : '系统默认',
  })

  return { apiKey, baseURL, model }
}

/**
 * 将表单数据转换为历史记录格式
 */
function convertToHistoryFormData(formData: TripFormData): ChatTripFormData {
  return {
    destination: formData.destination,
    startDate: formData.start_date,
    endDate: formData.end_date,
    budget: formData.budget,
    travelers: formData.travelers,
    origin: formData.origin,
    preferences: formData.preferences,
  }
}

// ============================================================================
// POST 处理器 - SSE 流式响应
// ============================================================================

/**
 * POST /api/v2/generate-itinerary
 * 使用 LangGraph 工作流生成行程
 * 支持 SSE 流式响应
 */
export async function POST(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const formData: TripFormData = await request.json()

    // 验证必填字段
    if (!formData.destination || !formData.start_date || !formData.end_date) {
      throw new ValidationError('缺少必填字段：目的地、开始日期或结束日期')
    }

    // 检查是否请求流式响应
    const acceptHeader = request.headers.get('accept') || ''
    const isStreamRequest = acceptHeader.includes('text/event-stream')

    logger.info('开始生成行程 (v2)', {
      userId: user.id,
      destination: formData.destination,
      streaming: isStreamRequest,
    })

    // 获取 AI 配置
    const aiConfig = await getAIConfig(supabase, user.id)

    // 确保 profile 存在
    await ensureUserProfile(supabase, user.id, user.email)

    // 重置工作流和追踪器以确保使用新配置
    resetTripPlanningWorkflow()
    resetTracer()

    // 工作流配置
    const workflowConfig = {
      ai: aiConfig,
      maxRetries: 3,
    }

    // 根据请求类型选择处理方式
    if (isStreamRequest) {
      // SSE 流式响应
      return handleStreamingResponse(formData, workflowConfig, user, supabase)
    } else {
      // 普通 JSON 响应
      return handleNormalResponse(formData, workflowConfig, user, supabase)
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/v2/generate-itinerary')
  }
}

/**
 * 处理流式 SSE 响应
 */
async function handleStreamingResponse(
  formData: TripFormData,
  workflowConfig: any,
  user: any,
  supabase: any
) {
  const encoder = new TextEncoder()
  const nodes = getWorkflowNodes()
  const startTime = Date.now()

  // 创建历史记录
  let historyId: string | null = null
  const historyFormData = convertToHistoryFormData(formData)
  try {
    historyId = await TripHistoryService.create(supabase, {
      userId: user.id,
      formData: historyFormData,
      workflowVersion: 'v2',
    })
    logger.info('创建历史记录', { historyId })
  } catch (historyError) {
    logger.warn('创建历史记录失败，继续生成行程', { error: (historyError as Error).message })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 发送开始事件
        sendSSEEvent(controller, encoder, {
          type: 'start',
          message: '开始生成行程...',
          data: { nodes: nodes.map((n) => ({ id: n.id, name: n.name })), historyId },
          timestamp: Date.now(),
        })

        let completedNodeCount = 0
        let finalState: TripState | null = null

        // 流式执行工作流
        const workflowStream = streamTripPlanningWorkflow(formData, {
          thread_id: `trip-${user.id}-${Date.now()}`,
          config: workflowConfig,
        })

        for await (const event of workflowStream) {
          const nodeId = event.node
          const nodeName = getNodeDisplayName(nodeId)
          completedNodeCount++

          // 发送节点完成事件
          sendSSEEvent(controller, encoder, {
            type: 'node_complete',
            node: nodeId,
            nodeName,
            progress: calculateProgress(completedNodeCount, nodes.length),
            message: `${nodeName} 完成`,
            timestamp: event.timestamp,
          })

          // 保存最新状态
          if (event.state) {
            finalState = { ...finalState, ...event.state } as TripState
          }
        }

        // 检查是否成功生成行程
        if (!finalState?.finalItinerary) {
          throw new Error('工作流执行完成但未生成有效行程')
        }

        // 保存到数据库
        const trip = await saveTripToDatabase(
          supabase,
          user.id,
          formData,
          finalState.finalItinerary
        )

        // 计算结果摘要
        const itinerary = finalState.finalItinerary
        const totalDays = itinerary.days?.length || 0

        // 更新历史记录为成功
        if (historyId) {
          const resultSummary: TripResultSummary = {
            destination: formData.destination,
            totalDays,
            totalBudget: formData.budget,
            attractionCount: itinerary.days?.reduce(
              (acc, day) => acc + (day.activities?.length || 0),
              0
            ) || 0,
            hotelCount: itinerary.accommodation?.length || 0,
            highlights: itinerary.days?.slice(0, 3).map(
              day => day.activities?.[0]?.name || `第${day.day}天`
            ).filter(Boolean) || [],
          }

          await TripHistoryService.update(supabase, historyId, {
            status: 'completed',
            tripId: trip.id,
            resultSummary,
            generationDurationMs: Date.now() - startTime,
          })
          logger.info('历史记录更新为成功', { historyId, tripId: trip.id })
        }

        logger.info('行程生成成功 (v2 streaming)', {
          tripId: trip.id,
          days: totalDays,
        })

        // 发送完成事件
        sendSSEEvent(controller, encoder, {
          type: 'complete',
          progress: 100,
          message: '行程生成完成！',
          data: {
            trip_id: trip.id,
            itinerary: finalState.finalItinerary,
            budgetResult: finalState.budgetResult,
          },
          timestamp: Date.now(),
        })
      } catch (error) {
        logger.error('流式生成行程失败', error as Error)

        // 更新历史记录为失败
        if (historyId) {
          try {
            await TripHistoryService.update(supabase, historyId, {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : '未知错误',
              generationDurationMs: Date.now() - startTime,
            })
            logger.info('历史记录更新为失败', { historyId })
          } catch (updateError) {
            logger.warn('更新历史记录失败', { error: (updateError as Error).message })
          }
        }

        // 发送错误事件
        sendSSEEvent(controller, encoder, {
          type: 'error',
          message: error instanceof Error ? error.message : '生成行程时发生未知错误',
          timestamp: Date.now(),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * 处理普通 JSON 响应
 */
async function handleNormalResponse(
  formData: TripFormData,
  workflowConfig: any,
  user: any,
  supabase: any
) {
  const startTime = Date.now()

  // 创建历史记录
  let historyId: string | null = null
  const historyFormData = convertToHistoryFormData(formData)
  try {
    historyId = await TripHistoryService.create(supabase, {
      userId: user.id,
      formData: historyFormData,
      workflowVersion: 'v2',
    })
    logger.info('创建历史记录', { historyId })
  } catch (historyError) {
    logger.warn('创建历史记录失败，继续生成行程', { error: (historyError as Error).message })
  }

  try {
    // 执行工作流
    const finalState = await executeTripPlanningWorkflow(formData, {
      thread_id: `trip-${user.id}-${Date.now()}`,
      config: workflowConfig,
    })

    // 检查是否成功生成行程
    if (!finalState?.finalItinerary) {
      throw new Error('工作流执行完成但未生成有效行程')
    }

    // 保存到数据库
    const trip = await saveTripToDatabase(supabase, user.id, formData, finalState.finalItinerary)

    // 计算结果摘要
    const itinerary = finalState.finalItinerary
    const totalDays = itinerary.days?.length || 0

    // 更新历史记录为成功
    if (historyId) {
      const resultSummary: TripResultSummary = {
        destination: formData.destination,
        totalDays,
        totalBudget: formData.budget,
        attractionCount: itinerary.days?.reduce(
          (acc, day) => acc + (day.activities?.length || 0),
          0
        ) || 0,
        hotelCount: itinerary.accommodation?.length || 0,
        highlights: itinerary.days?.slice(0, 3).map(
          day => day.activities?.[0]?.name || `第${day.day}天`
        ).filter(Boolean) || [],
      }

      await TripHistoryService.update(supabase, historyId, {
        status: 'completed',
        tripId: trip.id,
        resultSummary,
        generationDurationMs: Date.now() - startTime,
      })
      logger.info('历史记录更新为成功', { historyId, tripId: trip.id })
    }

    logger.info('行程生成成功 (v2)', {
      tripId: trip.id,
      days: totalDays,
    })

    return successResponse(
      {
        trip_id: trip.id,
        itinerary: finalState.finalItinerary,
        budgetResult: finalState.budgetResult,
      },
      '行程生成成功'
    )
  } catch (error) {
    // 更新历史记录为失败
    if (historyId) {
      try {
        await TripHistoryService.update(supabase, historyId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : '未知错误',
          generationDurationMs: Date.now() - startTime,
        })
        logger.info('历史记录更新为失败', { historyId })
      } catch (updateError) {
        logger.warn('更新历史记录失败', { error: (updateError as Error).message })
      }
    }
    throw error
  }
}

// ============================================================================
// GET 处理器 - 获取工作流节点列表
// ============================================================================

/**
 * GET /api/v2/generate-itinerary
 * 返回工作流节点列表（用于前端进度显示）
 */
export async function GET() {
  const nodes = getWorkflowNodes()
  return successResponse({ nodes }, '获取成功')
}
