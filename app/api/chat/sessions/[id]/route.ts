/**
 * API: /api/chat/sessions/[id]
 * 单个会话管理 API
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, noContentResponse } from '@/app/api/_utils/response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { ChatMessage, ChatSession } from '@/lib/chat'

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/chat/sessions/[id]
 * 获取会话详情及消息历史
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: sessionId } = await params

    // 获取会话
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        trips:trip_id (
          id,
          destination,
          start_date,
          end_date,
          budget,
          travelers,
          itinerary
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new NotFoundError('会话不存在或无权访问')
    }

    // 获取消息历史
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const cursor = searchParams.get('cursor')

    let messagesQuery = supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (cursor) {
      messagesQuery = messagesQuery.gt('created_at', cursor)
    }

    const { data: messages, error: messagesError } = await messagesQuery

    if (messagesError) {
      logger.error('获取消息历史失败', messagesError as Error)
      throw messagesError
    }

    // 格式化消息
    const formattedMessages: ChatMessage[] = (messages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: msg.metadata,
    }))

    // 格式化会话
    const formattedSession: ChatSession = {
      id: session.id,
      userId: session.user_id,
      tripId: session.trip_id,
      title: session.title,
      context: {
        currentTrip: session.trips || undefined,
      },
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }

    // 判断是否还有更多消息
    const hasMore = messages && messages.length === limit
    const nextCursor = hasMore ? messages[messages.length - 1].created_at : undefined

    return successResponse({
      session: formattedSession,
      messages: formattedMessages,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/chat/sessions/[id]')
  }
}

// ============================================================================
// PATCH 处理器
// ============================================================================

/**
 * PATCH /api/chat/sessions/[id]
 * 更新会话（标题、状态等）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: sessionId } = await params
    const body = await request.json()

    // 验证会话归属
    const { data: existing, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      throw new NotFoundError('会话不存在或无权访问')
    }

    // 允许更新的字段
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) {
      updateData.title = body.title
    }

    if (body.status !== undefined) {
      if (!['active', 'archived'].includes(body.status)) {
        throw new ValidationError('无效的状态值')
      }
      updateData.status = body.status
    }

    if (body.trip_id !== undefined) {
      // 验证行程归属
      if (body.trip_id) {
        const { data: trip } = await supabase
          .from('trips')
          .select('id')
          .eq('id', body.trip_id)
          .eq('user_id', user.id)
          .single()

        if (!trip) {
          throw new ValidationError('行程不存在或无权访问')
        }
      }
      updateData.trip_id = body.trip_id
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('没有有效的更新字段')
    }

    // 更新会话
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      logger.error('更新会话失败', error as Error)
      throw error
    }

    return successResponse({
      id: session.id,
      title: session.title,
      tripId: session.trip_id,
      status: session.status,
      updatedAt: session.updated_at,
    })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/chat/sessions/[id]')
  }
}

// ============================================================================
// DELETE 处理器
// ============================================================================

/**
 * DELETE /api/chat/sessions/[id]
 * 删除会话
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await requireAuth(request)
    const { id: sessionId } = await params

    // 验证会话归属
    const { data: existing, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      throw new NotFoundError('会话不存在或无权访问')
    }

    // 删除会话（关联的消息会通过级联删除自动删除）
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      logger.error('删除会话失败', error as Error)
      throw error
    }

    logger.info('删除会话成功', {
      userId: user.id,
      sessionId,
    })

    return noContentResponse()
  } catch (error) {
    return handleApiError(error, 'DELETE /api/chat/sessions/[id]')
  }
}
