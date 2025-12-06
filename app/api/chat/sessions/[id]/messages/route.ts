/**
 * API: /api/chat/sessions/[id]/messages
 * 会话消息历史 API
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse } from '@/app/api/_utils/response'
import { NotFoundError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { ChatMessage } from '@/lib/chat'

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/chat/sessions/[id]/messages
 * 获取会话的消息历史（支持分页）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: sessionId } = await params

    // 验证会话归属
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new NotFoundError('会话不存在或无权访问')
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // 游标：获取此时间之前的消息
    const after = searchParams.get('after') // 游标：获取此时间之后的消息

    // 构建查询
    let query = supabase
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    if (after) {
      query = query.gt('created_at', after)
    }

    const { data: messages, error, count } = await query

    if (error) {
      logger.error('获取消息历史失败', error as Error)
      throw error
    }

    // 格式化消息
    const formattedMessages: ChatMessage[] = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: msg.metadata,
    }))

    // 判断是否还有更多消息
    const hasMore = messages && messages.length === limit
    const nextCursor = hasMore ? messages[messages.length - 1].created_at : undefined
    const prevCursor = messages && messages.length > 0 ? messages[0].created_at : undefined

    return successResponse({
      messages: formattedMessages,
      total: count || 0,
      hasMore,
      nextCursor,
      prevCursor,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/chat/sessions/[id]/messages')
  }
}

// ============================================================================
// DELETE 处理器
// ============================================================================

/**
 * DELETE /api/chat/sessions/[id]/messages
 * 清空会话的所有消息
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: sessionId } = await params

    // 验证会话归属
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new NotFoundError('会话不存在或无权访问')
    }

    // 删除所有消息
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      logger.error('清空消息失败', error as Error)
      throw error
    }

    // 更新会话时间和标题
    await supabase
      .from('chat_sessions')
      .update({
        title: '新对话',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    logger.info('清空会话消息成功', {
      userId: user.id,
      sessionId,
    })

    return successResponse({ message: '消息已清空' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/chat/sessions/[id]/messages')
  }
}
