/**
 * API: /api/v2/workflow/resume
 * 恢复中断的 Human-in-the-Loop 工作流
 * 接收用户决策并继续执行工作流
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import {
  resumeHITLWorkflow,
  getHITLWorkflowNodes,
  type HITLUserDecision,
  type HITLTripState,
  type HITLInterruptType,
} from '@/lib/agents'
import { ApiKeyClient } from '@/lib/api-keys'
import { appConfig } from '@/lib/config'
import { ValidationError, NotFoundError, ConfigurationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// ============================================================================
// 请求体类型
// ============================================================================

interface ResumeWorkflowRequest {
  thread_id: string
  decision: HITLUserDecision
}

// ============================================================================
// SSE 事件类型
// ============================================================================

interface HITLSSEEvent {
  type:
    | 'resumed' // 工作流已恢复
    | 'node_complete' // 节点执行完成
    | 'interrupt' // 再次中断
    | 'error' // 错误
    | 'complete' // 工作流完成
  threadId?: string
  node?: string
  nodeName?: string
  progress?: number
  message?: string
  interruptType?: HITLInterruptType
  interruptData?: {
    options: unknown
  }
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

// ============================================================================
// 辅助函数
// ============================================================================

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
 * 验证中断记录是否属于当前用户
 */
async function validateInterruptOwnership(
  supabase: any,
  userId: string,
  threadId: string
) {
  const { data: interrupt, error } = await supabase
    .from('workflow_interrupts')
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single()

  if (error || !interrupt) {
    throw new NotFoundError('找不到待处理的工作流中断，或中断已过期')
  }

  return interrupt
}

/**
 * 更新中断状态
 */
async function updateInterruptStatus(
  supabase: any,
  threadId: string,
  status: 'resumed' | 'cancelled',
  userDecision: HITLUserDecision
) {
  const { error } = await supabase
    .from('workflow_interrupts')
    .update({
      status,
      user_decision: userDecision,
      resumed_at: new Date().toISOString(),
    })
    .eq('thread_id', threadId)

  if (error) {
    logger.error('更新中断状态失败', error as Error)
  }
}

/**
 * 保存新的中断状态
 */
async function saveNewInterrupt(
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
    logger.error('保存新中断状态失败', error as Error)
  }
}

/**
 * 保存行程到数据库
 */
async function saveTripToDatabase(
  supabase: any,
  userId: string,
  state: HITLTripState
) {
  const formData = state.userInput
  const itinerary = state.finalItinerary

  if (!formData || !itinerary) {
    throw new Error('无法保存行程：缺少必要数据')
  }

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
// POST 处理器
// ============================================================================

/**
 * POST /api/v2/workflow/resume
 * 恢复中断的工作流
 */
export async function POST(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const body: ResumeWorkflowRequest = await request.json()
    const { thread_id: threadId, decision } = body

    // 验证必填字段
    if (!threadId) {
      throw new ValidationError('缺少必填字段：thread_id')
    }

    if (!decision || !decision.type) {
      throw new ValidationError('缺少必填字段：decision')
    }

    // 验证中断记录
    const interrupt = await validateInterruptOwnership(supabase, user.id, threadId)

    logger.info('恢复 HITL 工作流', {
      userId: user.id,
      threadId,
      decisionType: decision.type,
      interruptType: interrupt.interrupt_type,
    })

    // 处理取消操作
    if (decision.type === 'cancel') {
      await updateInterruptStatus(supabase, threadId, 'cancelled', decision)

      return successResponse(
        {
          status: 'cancelled',
          thread_id: threadId,
        },
        '工作流已取消'
      )
    }

    // 获取 AI 配置
    const aiConfig = await getAIConfig(supabase, user.id)

    // 工作流配置
    const workflowConfig = {
      ai: aiConfig,
      maxRetries: 3,
      hitl: {
        enableItineraryReview: true,
        enableBudgetDecision: true,
        budgetOverageThreshold: 0.1,
      },
    }

    // 检查是否请求流式响应
    const acceptHeader = request.headers.get('accept') || ''
    const isStreamRequest = acceptHeader.includes('text/event-stream')

    if (isStreamRequest) {
      return handleStreamingResume(
        threadId,
        decision,
        workflowConfig,
        interrupt,
        user,
        supabase
      )
    } else {
      return handleNormalResume(
        threadId,
        decision,
        workflowConfig,
        interrupt,
        user,
        supabase
      )
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/v2/workflow/resume')
  }
}

/**
 * 处理流式恢复
 */
async function handleStreamingResume(
  threadId: string,
  decision: HITLUserDecision,
  workflowConfig: any,
  interrupt: any,
  user: any,
  supabase: any
) {
  const encoder = new TextEncoder()
  const nodes = getHITLWorkflowNodes()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 发送恢复事件
        sendSSEEvent(controller, encoder, {
          type: 'resumed',
          threadId,
          message: '工作流已恢复执行...',
          timestamp: Date.now(),
        })

        // 更新中断状态
        await updateInterruptStatus(supabase, threadId, 'resumed', decision)

        // 恢复工作流
        const result = await resumeHITLWorkflow(threadId, decision, workflowConfig)

        if (result.status === 'interrupted') {
          // 再次中断
          await saveNewInterrupt(
            supabase,
            user.id,
            threadId,
            result.interruptType!,
            result.state,
            result.options
          )

          sendSSEEvent(controller, encoder, {
            type: 'interrupt',
            threadId,
            interruptType: result.interruptType || undefined,
            message: result.interruptMessage || '请确认或调整',
            interruptData: {
              options: result.options,
            },
            timestamp: Date.now(),
          })
        } else if (result.status === 'completed') {
          const finalState = result.state as HITLTripState

          if (finalState?.finalItinerary) {
            // 保存行程
            const trip = await saveTripToDatabase(supabase, user.id, finalState)

            logger.info('HITL 行程生成成功（恢复后）', {
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
                itinerary: finalState.finalItinerary,
                budgetResult: finalState.budgetResult,
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
        } else {
          sendSSEEvent(controller, encoder, {
            type: 'error',
            threadId,
            message: `工作流状态异常: ${(result as any).status}`,
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        logger.error('恢复 HITL 工作流失败', error as Error)

        sendSSEEvent(controller, encoder, {
          type: 'error',
          threadId,
          message: error instanceof Error ? error.message : '恢复工作流时发生未知错误',
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
 * 处理普通恢复
 */
async function handleNormalResume(
  threadId: string,
  decision: HITLUserDecision,
  workflowConfig: any,
  interrupt: any,
  user: any,
  supabase: any
) {
  // 更新中断状态
  await updateInterruptStatus(supabase, threadId, 'resumed', decision)

  // 恢复工作流
  const result = await resumeHITLWorkflow(threadId, decision, workflowConfig)

  if (result.status === 'interrupted') {
    // 再次中断
    await saveNewInterrupt(
      supabase,
      user.id,
      threadId,
      result.interruptType!,
      result.state,
      result.options
    )

    logger.info('HITL 工作流再次中断', {
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
      '工作流再次暂停，等待用户确认'
    )
  }

  if (result.status === 'completed') {
    const finalState = result.state as HITLTripState

    if (finalState?.finalItinerary) {
      // 保存行程
      const trip = await saveTripToDatabase(supabase, user.id, finalState)

      logger.info('HITL 行程生成成功（恢复后）', {
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

    return successResponse(
      {
        status: 'completed',
        thread_id: threadId,
      },
      '工作流执行完成'
    )
  }

  // 其他状态
  return successResponse(
    {
      status: (result as any).status,
      thread_id: threadId,
      error: (result as any).error,
    },
    '工作流状态异常'
  )
}
