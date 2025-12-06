/**
 * API: /api/v2/workflow/status
 * 获取 Human-in-the-Loop 工作流状态
 * 支持查询单个工作流状态和获取用户所有待处理中断
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { getHITLWorkflowState, type HITLInterruptType } from '@/lib/agents'
import { ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// ============================================================================
// 响应类型
// ============================================================================

interface WorkflowStatusResponse {
  thread_id: string
  status: 'running' | 'interrupted' | 'completed' | 'cancelled' | 'expired' | 'not_found'
  interrupt?: {
    type: HITLInterruptType
    message: string
    options: unknown
    created_at: string
    expires_at: string
  }
  result?: {
    trip_id?: string
    itinerary?: unknown
    budgetResult?: unknown
  }
}

interface PendingInterruptsResponse {
  interrupts: Array<{
    thread_id: string
    interrupt_type: HITLInterruptType
    workflow_type: string
    created_at: string
    expires_at: string
    state_snapshot: unknown
    options: unknown
  }>
  total: number
}

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/v2/workflow/status
 *
 * 查询参数:
 * - thread_id: 查询特定工作流状态
 * - pending: 设为 true 获取所有待处理中断
 */
export async function GET(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')
    const pending = searchParams.get('pending') === 'true'

    // 获取所有待处理中断
    if (pending) {
      return handleGetPendingInterrupts(supabase, user.id)
    }

    // 查询特定工作流状态
    if (threadId) {
      return handleGetWorkflowStatus(supabase, user.id, threadId)
    }

    throw new ValidationError('缺少查询参数：thread_id 或 pending')
  } catch (error) {
    return handleApiError(error, 'GET /api/v2/workflow/status')
  }
}

/**
 * 获取特定工作流状态
 */
async function handleGetWorkflowStatus(
  supabase: any,
  userId: string,
  threadId: string
) {
  // 首先查询数据库中的中断记录
  const { data: interrupt, error: dbError } = await supabase
    .from('workflow_interrupts')
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .single()

  if (dbError && dbError.code !== 'PGRST116') {
    // PGRST116 表示没有找到记录，其他错误需要处理
    logger.error('查询工作流中断状态失败', dbError as Error)
  }

  // 如果数据库有记录
  if (interrupt) {
    const response: WorkflowStatusResponse = {
      thread_id: threadId,
      status: interrupt.status as WorkflowStatusResponse['status'],
    }

    if (interrupt.status === 'pending') {
      // 检查是否过期
      const expiresAt = new Date(interrupt.expires_at)
      if (expiresAt < new Date()) {
        // 更新状态为过期
        await supabase
          .from('workflow_interrupts')
          .update({ status: 'expired' })
          .eq('thread_id', threadId)

        response.status = 'expired'
      } else {
        response.interrupt = {
          type: interrupt.interrupt_type,
          message: getInterruptMessage(interrupt.interrupt_type),
          options: interrupt.options,
          created_at: interrupt.created_at,
          expires_at: interrupt.expires_at,
        }
      }
    }

    logger.info('查询工作流状态', {
      threadId,
      status: response.status,
    })

    return successResponse(response, '查询成功')
  }

  // 数据库没有记录，尝试从 checkpointer 获取状态
  try {
    const workflowState = await getHITLWorkflowState(threadId)

    const response: WorkflowStatusResponse = {
      thread_id: threadId,
      status: workflowState.status as WorkflowStatusResponse['status'],
    }

    if (workflowState.status === 'interrupted') {
      response.interrupt = {
        type: workflowState.interruptType!,
        message: workflowState.interruptMessage || getInterruptMessage(workflowState.interruptType!),
        options: workflowState.options,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    }

    if (workflowState.status === 'completed' && workflowState.state) {
      const state = workflowState.state
      response.result = {
        itinerary: state.finalItinerary,
        budgetResult: state.budgetResult,
      }
    }

    return successResponse(response, '查询成功')
  } catch (error) {
    logger.warn('从 checkpointer 获取状态失败', { threadId, error })

    // 找不到工作流
    return successResponse(
      {
        thread_id: threadId,
        status: 'not_found',
      } as WorkflowStatusResponse,
      '找不到工作流'
    )
  }
}

/**
 * 获取所有待处理中断
 */
async function handleGetPendingInterrupts(supabase: any, userId: string) {
  // 首先清理过期的中断
  await supabase.rpc('cleanup_expired_interrupts').catch(() => {
    // 如果函数不存在，静默失败
  })

  // 查询待处理中断
  const { data: interrupts, error } = await supabase
    .from('workflow_interrupts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('查询待处理中断失败', error as Error)
    throw error
  }

  // 过滤掉已过期的
  const validInterrupts = (interrupts || []).filter((i: any) => {
    const expiresAt = new Date(i.expires_at)
    return expiresAt > new Date()
  })

  const response: PendingInterruptsResponse = {
    interrupts: validInterrupts.map((i: any) => ({
      thread_id: i.thread_id,
      interrupt_type: i.interrupt_type,
      workflow_type: i.workflow_type,
      created_at: i.created_at,
      expires_at: i.expires_at,
      state_snapshot: i.state_snapshot,
      options: i.options,
    })),
    total: validInterrupts.length,
  }

  logger.info('查询待处理中断', {
    userId,
    count: response.total,
  })

  return successResponse(response, '查询成功')
}

/**
 * 获取中断类型的默认消息
 */
function getInterruptMessage(interruptType: HITLInterruptType): string {
  switch (interruptType) {
    case 'itinerary_review':
      return '行程骨架已生成，请确认或调整景点选择'
    case 'budget_decision':
      return '预算超支，请选择调整方案'
    case 'final_confirm':
      return '行程已生成，请最终确认'
    default:
      return '请确认或调整'
  }
}

// ============================================================================
// DELETE 处理器
// ============================================================================

/**
 * DELETE /api/v2/workflow/status
 * 取消/删除工作流中断
 */
export async function DELETE(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')

    if (!threadId) {
      throw new ValidationError('缺少查询参数：thread_id')
    }

    // 更新状态为已取消
    const { data, error } = await supabase
      .from('workflow_interrupts')
      .update({ status: 'cancelled' })
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ValidationError('找不到待处理的工作流中断')
      }
      throw error
    }

    logger.info('取消工作流中断', {
      threadId,
      userId: user.id,
    })

    return successResponse(
      {
        thread_id: threadId,
        status: 'cancelled',
      },
      '工作流已取消'
    )
  } catch (error) {
    return handleApiError(error, 'DELETE /api/v2/workflow/status')
  }
}
