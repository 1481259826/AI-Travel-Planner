/**
 * API: /api/chat
 * 对话 Agent API 端点
 * 支持 SSE 流式响应
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/app/api/_middleware'
import { handleApiError } from '@/app/api/_middleware/error-handler'
import { successResponse, errorResponse } from '@/app/api/_utils/response'
import { TravelChatAgent, getToolDescription, getToolIcon } from '@/lib/chat'
import type { ChatMessage, ChatStreamEvent, ChatContext } from '@/lib/chat'
import { ApiKeyClient } from '@/lib/api-keys'
import { appConfig } from '@/lib/config'
import { ValidationError, ConfigurationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// 请求体类型
// ============================================================================

interface ChatRequest {
  session_id?: string
  message: string
  trip_id?: string
}

// ============================================================================
// SSE 辅助函数
// ============================================================================

function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: ChatStreamEvent
) {
  const data = JSON.stringify(event)
  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
}

// ============================================================================
// POST 处理器
// ============================================================================

/**
 * POST /api/chat
 * 发送消息并获取 AI 回复
 */
export async function POST(request: NextRequest) {
  try {
    // 认证
    const { user, supabase } = await requireAuth(request)

    // 解析请求体
    const body: ChatRequest = await request.json()
    const { session_id, message, trip_id } = body

    // 验证必填字段
    if (!message?.trim()) {
      throw new ValidationError('消息内容不能为空')
    }

    logger.info('收到对话请求', {
      userId: user.id,
      sessionId: session_id,
      tripId: trip_id,
      messageLength: message.length,
    })

    // 获取 AI 配置
    const aiConfig = await getAIConfig(supabase, user.id)

    // 获取或创建会话
    let sessionId = session_id
    let context: ChatContext = {}

    if (sessionId) {
      // 获取现有会话
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (error || !session) {
        throw new ValidationError('会话不存在或无权访问')
      }

      context = (session.context as ChatContext) || {}
    } else {
      // 创建新会话
      sessionId = uuidv4()
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')

      const { error } = await supabase.from('chat_sessions').insert({
        id: sessionId,
        user_id: user.id,
        trip_id: trip_id || null,
        title,
        context: {},
        status: 'active',
      })

      if (error) {
        logger.error('创建会话失败', error as Error)
        throw new Error('创建会话失败')
      }
    }

    // 如果有关联行程，加载行程信息
    if (trip_id) {
      const { data: trip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', trip_id)
        .eq('user_id', user.id)
        .single()

      if (trip) {
        context.currentTrip = trip
      }
    }

    // 获取历史消息
    const { data: historyData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50) // 限制历史消息数量

    const historyMessages: ChatMessage[] = (historyData || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: msg.metadata,
    }))

    // 添加当前用户消息
    const userMessageId = uuidv4()
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }

    // 保存用户消息
    await supabase.from('chat_messages').insert({
      id: userMessageId,
      session_id: sessionId,
      role: 'user',
      content: message,
      metadata: {},
    })

    // 完整的消息列表
    const allMessages = [...historyMessages, userMessage]

    // 检查是否请求流式响应
    const acceptHeader = request.headers.get('accept') || ''
    const isStreamRequest = acceptHeader.includes('text/event-stream')

    if (isStreamRequest) {
      return handleStreamingResponse(
        aiConfig,
        allMessages,
        context,
        sessionId,
        user.id,
        supabase
      )
    } else {
      return handleNormalResponse(
        aiConfig,
        allMessages,
        context,
        sessionId,
        user.id,
        supabase
      )
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/chat')
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
 * 处理流式 SSE 响应
 */
async function handleStreamingResponse(
  aiConfig: { apiKey: string; baseURL: string; model: string },
  messages: ChatMessage[],
  context: ChatContext,
  sessionId: string,
  userId: string,
  supabase: any
) {
  const encoder = new TextEncoder()
  const assistantMessageId = uuidv4()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 创建 Agent
        const agent = new TravelChatAgent({
          apiKey: aiConfig.apiKey,
          baseURL: aiConfig.baseURL,
          model: aiConfig.model,
          enableTools: true,
        })

        // 创建工具执行器
        agent.createToolExecutor({
          supabase,
          userId,
        })

        // 收集完整响应
        let fullContent = ''
        const toolCalls: any[] = []

        // 流式对话
        for await (const event of agent.chat(messages, context)) {
          if (event.type === 'start') {
            sendSSEEvent(controller, encoder, {
              type: 'start',
              sessionId,
              messageId: assistantMessageId,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'delta' && event.delta) {
            fullContent += event.delta
            sendSSEEvent(controller, encoder, {
              type: 'delta',
              delta: event.delta,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'tool_call' && event.toolCall) {
            toolCalls.push(event.toolCall)
            sendSSEEvent(controller, encoder, {
              type: 'tool_call',
              toolCall: event.toolCall,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'tool_result') {
            sendSSEEvent(controller, encoder, {
              type: 'tool_result',
              toolCallId: event.toolCallId,
              toolResult: event.toolResult,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'error') {
            sendSSEEvent(controller, encoder, {
              type: 'error',
              error: event.error,
              timestamp: event.timestamp,
            })
          }

          if (event.type === 'end') {
            // 保存助手消息
            await supabase.from('chat_messages').insert({
              id: assistantMessageId,
              session_id: sessionId,
              role: 'assistant',
              content: fullContent,
              metadata: toolCalls.length > 0 ? { toolCalls } : {},
            })

            // 更新会话时间
            await supabase
              .from('chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', sessionId)

            sendSSEEvent(controller, encoder, {
              type: 'end',
              fullContent,
              timestamp: event.timestamp,
            })
          }
        }
      } catch (error) {
        logger.error('对话流式处理失败', error as Error)
        sendSSEEvent(controller, encoder, {
          type: 'error',
          error: error instanceof Error ? error.message : '对话处理失败',
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
  aiConfig: { apiKey: string; baseURL: string; model: string },
  messages: ChatMessage[],
  context: ChatContext,
  sessionId: string,
  userId: string,
  supabase: any
) {
  try {
    // 创建 Agent
    const agent = new TravelChatAgent({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
      model: aiConfig.model,
      enableTools: true,
    })

    // 创建工具执行器
    agent.createToolExecutor({
      supabase,
      userId,
    })

    // 非流式对话
    const result = await agent.chatOnce(messages, context)
    const assistantMessageId = uuidv4()

    // 保存助手消息
    await supabase.from('chat_messages').insert({
      id: assistantMessageId,
      session_id: sessionId,
      role: 'assistant',
      content: result.content,
      metadata: result.toolCalls ? { toolCalls: result.toolCalls } : {},
    })

    // 更新会话时间
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return successResponse({
      session_id: sessionId,
      message: {
        id: assistantMessageId,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        metadata: result.toolCalls ? { toolCalls: result.toolCalls } : undefined,
      },
    })
  } catch (error) {
    logger.error('对话处理失败', error as Error)
    throw error
  }
}
