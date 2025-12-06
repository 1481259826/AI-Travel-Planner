/**
 * 旅行对话 Agent
 * 支持流式对话和工具调用的 AI 助手
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMCPClient } from '../agents/mcp-client'
import { ToolExecutor } from './executor'
import { getOpenAITools } from './tools'
import type {
  ChatMessage,
  ChatContext,
  ChatStreamEvent,
  ToolCall,
  ChatAgentConfig,
} from './types'

// ============================================================================
// 常量
// ============================================================================

const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7
const MAX_TOOL_ROUNDS = 5 // 最大工具调用轮数

// ============================================================================
// TravelChatAgent 类
// ============================================================================

/**
 * 旅行对话 Agent
 * 提供流式对话能力和工具调用支持
 */
export class TravelChatAgent {
  private client: OpenAI
  private model: string
  private maxTokens: number
  private temperature: number
  private enableTools: boolean
  private maxToolRounds: number
  private toolExecutor: ToolExecutor | null = null

  constructor(config: ChatAgentConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model || DEFAULT_MODEL
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS
    this.temperature = config.temperature || DEFAULT_TEMPERATURE
    this.enableTools = config.enableTools !== false
    this.maxToolRounds = config.maxToolRounds || MAX_TOOL_ROUNDS
  }

  /**
   * 设置工具执行器
   */
  setToolExecutor(executor: ToolExecutor) {
    this.toolExecutor = executor
  }

  /**
   * 创建工具执行器
   */
  createToolExecutor(options: { supabase?: SupabaseClient; userId: string }) {
    this.toolExecutor = new ToolExecutor({
      mcpClient: getMCPClient(),
      supabase: options.supabase,
      userId: options.userId,
    })
    return this.toolExecutor
  }

  /**
   * 流式对话
   * @param messages 消息历史
   * @param context 对话上下文
   * @yields ChatStreamEvent
   */
  async *chat(
    messages: ChatMessage[],
    context: ChatContext
  ): AsyncGenerator<ChatStreamEvent> {
    const startTime = Date.now()

    yield {
      type: 'start',
      timestamp: startTime,
    }

    try {
      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(context)

      // 格式化消息
      const formattedMessages = this.formatMessages(messages)

      // 完整的消息列表
      const allMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...formattedMessages,
      ]

      // 工具调用轮数
      let toolRound = 0

      // 累积的完整响应
      let fullContent = ''

      // 循环处理，直到没有更多工具调用
      while (toolRound < this.maxToolRounds) {
        // 调用 API
        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages: allMessages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          tools: this.enableTools ? getOpenAITools() : undefined,
          tool_choice: this.enableTools ? 'auto' : undefined,
          stream: true,
        })

        // 累积当前轮次的内容和工具调用
        let currentContent = ''
        const toolCallsMap: Map<number, ToolCall> = new Map()

        // 处理流式响应
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta

          // 处理文本内容
          if (delta?.content) {
            currentContent += delta.content
            fullContent += delta.content
            yield {
              type: 'delta',
              delta: delta.content,
              timestamp: Date.now(),
            }
          }

          // 累积工具调用
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCallsMap.get(tc.index) || {
                id: '',
                type: 'function' as const,
                function: { name: '', arguments: '' },
              }

              if (tc.id) existing.id = tc.id
              if (tc.function?.name)
                existing.function.name += tc.function.name
              if (tc.function?.arguments)
                existing.function.arguments += tc.function.arguments

              toolCallsMap.set(tc.index, existing)
            }
          }
        }

        // 如果没有工具调用，结束循环
        if (toolCallsMap.size === 0) {
          break
        }

        // 有工具调用，执行它们
        toolRound++

        // 将助手消息添加到历史（包含工具调用）
        const toolCalls = Array.from(toolCallsMap.values())
        allMessages.push({
          role: 'assistant',
          content: currentContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          })),
        })

        // 执行每个工具调用
        for (const toolCall of toolCalls) {
          yield {
            type: 'tool_call',
            toolCall,
            timestamp: Date.now(),
          }

          // 执行工具
          let result: unknown
          let error: string | undefined

          if (this.toolExecutor) {
            const toolResult = await this.toolExecutor.execute(toolCall)
            result = toolResult.result
            error = toolResult.error
          } else {
            error = 'Tool executor not configured'
            result = { error }
          }

          yield {
            type: 'tool_result',
            toolCallId: toolCall.id,
            toolResult: result,
            timestamp: Date.now(),
          }

          // 将工具结果添加到消息历史
          allMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          })
        }

        // 继续下一轮，让 AI 基于工具结果生成响应
      }

      // 完成
      yield {
        type: 'end',
        fullContent,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[TravelChatAgent] Error:', error)
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      }
    }
  }

  /**
   * 非流式对话（用于简单场景）
   */
  async chatOnce(
    messages: ChatMessage[],
    context: ChatContext
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    const chunks: string[] = []
    const toolCalls: ToolCall[] = []

    for await (const event of this.chat(messages, context)) {
      if (event.type === 'delta' && event.delta) {
        chunks.push(event.delta)
      }
      if (event.type === 'tool_call' && event.toolCall) {
        toolCalls.push(event.toolCall)
      }
      if (event.type === 'error') {
        throw new Error(event.error)
      }
    }

    return {
      content: chunks.join(''),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(context: ChatContext): string {
    const basePrompt = `你是一个专业的 AI 旅行规划助手，名叫"旅行小助手"。

## 你的能力
- 搜索全国各地的景点、酒店、餐厅信息
- 规划完整的旅行行程
- 修改已有的行程安排
- 回答旅行相关的问题
- 计算交通路线和费用
- 获取目的地天气预报

## 你的风格
- 热情友好，像朋友一样交流
- 提供实用、具体的建议
- 主动询问用户偏好以提供更好的服务
- 回答简洁明了，避免冗长

## 重要规则
1. 当用户询问具体地点、景点、酒店、餐厅时，优先使用工具搜索获取真实数据
2. 不要编造景点信息、地址、评分等数据
3. 如果工具调用失败，诚实告知用户并提供替代建议
4. 金额使用人民币（元），距离使用公里/米`

    let contextInfo = ''

    // 添加行程上下文
    if (context.currentTrip) {
      const trip = context.currentTrip
      contextInfo = `

## 当前行程上下文
用户正在查看/编辑一个行程：
- 行程ID: ${trip.id}
- 目的地: ${trip.destination}
- 日期: ${trip.start_date} 至 ${trip.end_date}
- 预算: ¥${trip.budget}
- 人数: ${trip.travelers}人

你可以帮助用户：
1. 修改这个行程（使用 modify_itinerary 工具）
2. 回答关于这个行程的问题
3. 提供目的地 ${trip.destination} 的更多建议`

      // 添加行程详情摘要
      if (trip.itinerary?.days) {
        const daysSummary = trip.itinerary.days
          .map((day: any) => {
            const activities = day.activities
              ?.map((a: any) => a.name)
              .join('、')
            return `第${day.day}天: ${activities || '待安排'}`
          })
          .join('\n')
        contextInfo += `

当前行程安排：
${daysSummary}`
      }
    }

    // 添加用户偏好
    if (context.userPreferences) {
      const prefs = context.userPreferences
      contextInfo += `

## 用户偏好
${prefs.budget ? `- 预算偏好: ¥${prefs.budget}` : ''}
${prefs.travelStyle?.length ? `- 旅行风格: ${prefs.travelStyle.join('、')}` : ''}
${prefs.dietary?.length ? `- 饮食偏好: ${prefs.dietary.join('、')}` : ''}`
    }

    const toolsGuide = `

## 工具使用指南
- 搜索景点/餐厅/酒店：使用 search_attractions / search_restaurants / search_hotels
- 修改行程：使用 modify_itinerary（需要指定 trip_id 和操作类型）
- 查天气：使用 get_weather
- 查路线：使用 calculate_route
- 获取推荐：使用 get_recommendations

根据用户需求选择合适的工具。如果不需要工具，直接回答即可。`

    return basePrompt + contextInfo + toolsGuide
  }

  /**
   * 格式化消息为 OpenAI 格式
   */
  private formatMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: msg.metadata?.toolCalls?.[0]?.id || '',
          content: msg.content,
        }
      }

      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }
    })
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 TravelChatAgent 实例
 */
export function createChatAgent(config: ChatAgentConfig): TravelChatAgent {
  return new TravelChatAgent(config)
}

// ============================================================================
// 导出
// ============================================================================

export default TravelChatAgent
