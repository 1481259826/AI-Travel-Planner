/**
 * API: /api/v2/workflow/start
 * 启动 Human-in-the-Loop 工作流
 * 支持 SSE 流式响应，在中断点发送 interrupt 事件
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import {
  streamHITLWorkflow,
  startHITLWorkflow,
  getHITLWorkflowNodes,
  resetHITLWorkflow,
  resetTracer,
} from '@/lib/agents'
import type { HITLTripState, HITLInterruptType } from '@/lib/agents'
import { ApiKeyClient } from '@/lib/api-keys'
import { appConfig } from '@/lib/config'
import type { TripFormData } from '@/types'
import { ValidationError, ConfigurationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SSE 事件类型
// ============================================================================

interface HITLSSEEvent {
  type:
    | 'start' // 工作流开始
    | 'node_start' // 节点开始执行
    | 'node_complete' // 节点执行完成
    | 'progress' // 进度更新
    | 'interrupt' // 工作流中断，等待用户输入
    | 'resumed' // 工作流已恢复
    | 'error' // 错误
    | 'complete' // 工作流完成
  threadId?: string
  node?: string
  nodeName?: string
  progress?: number
  message?: string
  // 中断相关
  interruptType?: HITLInterruptType
  interruptData?: {
    options: unknown
    preview?: unknown
  }
  // 完成相关
  data?: unknown
  timestamp: number
}

/**
 * 发送 SSE 事件
 */
function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: HITLSSEEvent
) {
  const data = JSON.stringify(event)
  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
}

/**
 * 获取节点的显示名称
 */
function getNodeDisplayName(nodeId: string): string {
  const nodes = getHITLWorkflowNodes()
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
 * 获取 AI 配置
 */
async function getAIConfig(
  supabase: any,
  userId: string
): Promise<{ apiKey: string; baseURL: string; model: string }> {
  const userApiKeyConfig = await ApiKeyClient.getUserConfig(userId, 'deepseek', supabase)

  const apiKey = userApiKeyConfig?.apiKey || appConfig.deepseek.apiKey
  const baseURL = userApiKeyConfig?.baseUrl || appConfig.deepseek.baseURL
  const model = appConfig.deepseek.model

  if (!apiKey) {
    throw new ConfigurationError(
      '未配置 DeepSeek API Key。请在"设置 → API Key 管理"中添加，或在环境变量中配置。'
    )
  }

  return { apiKey, baseURL, model }
}

/**
 * 保存工作流中断状态到数据库
 */
async function saveWorkflowInterrupt(
  supabase: any,
  userId: string,
  threadId: string,
  interruptType: HITLInterruptType,
  stateSnapshot: unknown,
  options: unknown
) {
  const { error } = await supabase.from('workflow_interrupts').upsert({
    user_id: userId,
    thread_id: threadId,
    workflow_type: 'trip_planning',
    interrupt_type: interruptType,
    state_snapshot: stateSnapshot,
    options,
    status: 'pending',
  }, {
    onConflict: 'thread_id',
  })

  if (error) {
    logger.error('保存工作流中断状态失败', error as Error)
    // 不抛出错误，因为工作流状态已通过 checkpointer 保存
  }
}

// ============================================================================
// 请求体类型
// ============================================================================

interface StartWorkflowRequest {
  form_data: TripFormData
  enable_hitl?: boolean // 是否启用 Human-in-the-Loop，默认 true
}

// ============================================================================
// POST 处理器
// ============================================================================

/**
 * POST /api/v2/workflow/start
 * 启动 HITL 工作流
 */
export async function POST(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const body: StartWorkflowRequest = await request.json()
    const { form_data: formData, enable_hitl = true } = body

    // 验证必填字段
    if (!formData?.destination || !formData?.start_date || !formData?.end_date) {
      throw new ValidationError('缺少必填字段：目的地、开始日期或结束日期')
    }

    // 检查是否请求流式响应
    const acceptHeader = request.headers.get('accept') || ''
    const isStreamRequest = acceptHeader.includes('text/event-stream')

    logger.info('启动 HITL 工作流', {
      userId: user.id,
      destination: formData.destination,
      enableHITL: enable_hitl,
      streaming: isStreamRequest,
    })

    // 获取 AI 配置
    const aiConfig = await getAIConfig(supabase, user.id)

    // 确保 profile 存在
    await ensureUserProfile(supabase, user.id, user.email)

    // 重置工作流以确保使用新配置
    resetHITLWorkflow()
    resetTracer()

    // 生成线程 ID
    const threadId = `hitl-trip-${user.id}-${Date.now()}`

    // 工作流配置
    const workflowConfig = {
      ai: aiConfig,
      maxRetries: 3,
      hitl: {
        enableItineraryReview: enable_hitl,
        enableBudgetDecision: enable_hitl,
        budgetOverageThreshold: 0.1, // 超过 10% 才触发中断
      },
    }

    // 根据请求类型选择处理方式
    if (isStreamRequest) {
      return handleStreamingResponse(formData, workflowConfig, threadId, user, supabase)
    } else {
      return handleNormalResponse(formData, workflowConfig, threadId, user, supabase)
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/v2/workflow/start')
  }
}

/**
 * 处理流式 SSE 响应
 */
async function handleStreamingResponse(
  formData: TripFormData,
  workflowConfig: any,
  threadId: string,
  user: any,
  supabase: any
) {
  const encoder = new TextEncoder()
  const nodes = getHITLWorkflowNodes()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 发送开始事件
        sendSSEEvent(controller, encoder, {
          type: 'start',
          threadId,
          message: '开始生成行程...',
          data: {
            nodes: nodes.map((n) => ({
              id: n.id,
              name: n.name,
              hitlEnabled: n.hitlEnabled,
            })),
          },
          timestamp: Date.now(),
        })

        let completedNodeCount = 0

        // 流式执行工作流
        const workflowStream = streamHITLWorkflow(formData, {
          threadId,
          config: workflowConfig,
        })

        for await (const event of workflowStream) {
          if (event.type === 'start') {
            // 已发送过开始事件，跳过
            continue
          }

          if (event.type === 'interrupt') {
            // 工作流中断，等待用户输入
            logger.info('工作流中断', {
              threadId,
              interruptType: event.interruptType,
            })

            // 保存中断状态到数据库
            await saveWorkflowInterrupt(
              supabase,
              user.id,
              threadId,
              event.interruptType!,
              event, // 保存完整事件作为快照
              event.options
            )

            sendSSEEvent(controller, encoder, {
              type: 'interrupt',
              threadId,
              interruptType: event.interruptType || undefined,
              message: event.interruptMessage || '请确认或调整',
              interruptData: {
                options: event.options,
              },
              timestamp: event.timestamp,
            })

            // 中断时关闭流，等待用户恢复
            controller.close()
            return
          }

          if (event.type === 'node_complete') {
            const nodeId = event.node!
            const nodeName = getNodeDisplayName(nodeId)
            completedNodeCount++

            sendSSEEvent(controller, encoder, {
              type: 'node_complete',
              threadId,
              node: nodeId,
              nodeName,
              progress: calculateProgress(completedNodeCount, nodes.length),
              message: `${nodeName} 完成`,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'complete') {
            const state = event as any

            // 检查是否有最终行程
            if (state.state?.finalItinerary) {
              // 保存到数据库
              const trip = await saveTripToDatabase(
                supabase,
                user.id,
                formData,
                state.state.finalItinerary
              )

              logger.info('行程生成成功 (HITL streaming)', {
                tripId: trip.id,
                threadId,
              })

              sendSSEEvent(controller, encoder, {
                type: 'complete',
                threadId,
                progress: 100,
                message: '行程生成完成！',
                data: {
                  trip_id: trip.id,
                  itinerary: state.state.finalItinerary,
                  budgetResult: state.state.budgetResult,
                },
                timestamp: Date.now(),
              })
            } else {
              sendSSEEvent(controller, encoder, {
                type: 'complete',
                threadId,
                progress: 100,
                message: '工作流执行完成',
                timestamp: Date.now(),
              })
            }
          }

          if (event.type === 'error') {
            sendSSEEvent(controller, encoder, {
              type: 'error',
              threadId,
              message: (event as any).error || '发生未知错误',
              timestamp: event.timestamp,
            })
          }
        }
      } catch (error) {
        logger.error('流式 HITL 工作流失败', error as Error)

        sendSSEEvent(controller, encoder, {
          type: 'error',
          threadId,
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
  threadId: string,
  user: any,
  supabase: any
) {
  // 执行工作流
  const result = await startHITLWorkflow(formData, {
    threadId,
    config: workflowConfig,
  })

  if (result.status === 'interrupted') {
    // 工作流中断，保存状态
    await saveWorkflowInterrupt(
      supabase,
      user.id,
      threadId,
      result.interruptType!,
      result.state,
      result.options
    )

    logger.info('HITL 工作流中断', {
      threadId,
      interruptType: result.interruptType,
    })

    return successResponse(
      {
        status: 'interrupted',
        thread_id: threadId,
        interrupt_type: result.interruptType,
        message: result.interruptMessage,
        options: result.options,
      },
      '工作流已暂停，等待用户确认'
    )
  }

  if (result.status === 'completed') {
    const finalState = result.state as HITLTripState

    if (!finalState?.finalItinerary) {
      throw new Error('工作流执行完成但未生成有效行程')
    }

    // 保存到数据库
    const trip = await saveTripToDatabase(supabase, user.id, formData, finalState.finalItinerary)

    logger.info('HITL 行程生成成功', {
      tripId: trip.id,
      threadId,
    })

    return successResponse(
      {
        status: 'completed',
        thread_id: threadId,
        trip_id: trip.id,
        itinerary: finalState.finalItinerary,
        budgetResult: finalState.budgetResult,
      },
      '行程生成成功'
    )
  }

  // 其他状态
  return successResponse(
    {
      status: (result as any).status,
      thread_id: threadId,
    },
    '工作流状态未知'
  )
}

/**
 * 保存行程到数据库
 */
async function saveTripToDatabase(
  supabase: any,
  userId: string,
  formData: TripFormData,
  itinerary: any
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

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/v2/workflow/start
 * 返回 HITL 工作流节点列表
 */
export async function GET() {
  const nodes = getHITLWorkflowNodes()
  return successResponse({ nodes }, '获取成功')
}
