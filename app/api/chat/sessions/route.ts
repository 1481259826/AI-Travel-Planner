/**
 * API: /api/chat/sessions
 * 会话列表管理 API
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, createdResponse } from '@/app/api/_utils/response'
import { ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'
import type { ChatSessionListItem, CreateSessionRequest } from '@/lib/chat'

// ============================================================================
// GET 处理器
// ============================================================================

/**
 * GET /api/chat/sessions
 * 获取用户的会话列表
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const tripId = searchParams.get('trip_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 构建查询
    let query = supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        trip_id,
        status,
        created_at,
        updated_at,
        trips:trip_id (
          destination
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tripId) {
      query = query.eq('trip_id', tripId)
    }

    const { data: sessions, error, count } = await query

    if (error) {
      logger.error('获取会话列表失败', error as Error)
      throw error
    }

    // 获取每个会话的最后一条消息
    const sessionIds = sessions?.map((s: any) => s.id) || []

    let lastMessages: Record<string, string> = {}
    if (sessionIds.length > 0) {
      // 使用子查询获取每个会话的最后一条消息
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('session_id, content, created_at')
        .in('session_id', sessionIds)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })

      // 按会话分组，取第一条
      if (messages) {
        const seen = new Set<string>()
        for (const msg of messages) {
          if (!seen.has(msg.session_id)) {
            lastMessages[msg.session_id] = msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '')
            seen.add(msg.session_id)
          }
        }
      }
    }

    // 格式化响应
    const formattedSessions: ChatSessionListItem[] = (sessions || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      tripId: s.trip_id,
      tripDestination: s.trips?.destination,
      lastMessage: lastMessages[s.id],
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }))

    return successResponse({
      sessions: formattedSessions,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/chat/sessions')
  }
}

// ============================================================================
// POST 处理器
// ============================================================================

/**
 * POST /api/chat/sessions
 * 创建新会话
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body: CreateSessionRequest = await request.json()
    const { tripId, title, context } = body

    // 如果有关联行程，验证行程归属
    if (tripId) {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('id, destination')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single()

      if (error || !trip) {
        throw new ValidationError('行程不存在或无权访问')
      }
    }

    // 创建会话
    const sessionId = uuidv4()
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        trip_id: tripId || null,
        title: title || '新对话',
        context: context || {},
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      logger.error('创建会话失败', error as Error)
      throw error
    }

    logger.info('创建会话成功', {
      userId: user.id,
      sessionId,
      tripId,
    })

    return createdResponse({
      id: session.id,
      title: session.title,
      tripId: session.trip_id,
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/chat/sessions')
  }
}
