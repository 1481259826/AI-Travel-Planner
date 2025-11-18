/**
 * AI Service
 * 统一管理 AI 模型调用（DeepSeek、ModelScope 等）
 */

import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import config from '@/lib/config'
import { getUserApiKeyConfig } from '@/lib/api-keys'
import { AIModel } from '@/types'
import { getModelById } from '@/lib/models'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * AI 补全请求参数
 */
export interface AICompletionRequest {
  model: AIModel
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
}

/**
 * AI 补全响应
 */
export interface AICompletionResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * AI 服务类
 */
export class AIService {
  private serviceName = 'AIService'
  private userId?: string
  private supabaseClient?: SupabaseClient

  // 系统默认客户端
  private systemDeepSeek: OpenAI | null
  private systemModelScope: OpenAI | null

  constructor(userId?: string, supabaseClient?: SupabaseClient) {
    this.userId = userId
    this.supabaseClient = supabaseClient

    // 初始化系统默认客户端
    this.systemDeepSeek = config.deepseek.apiKey
      ? new OpenAI({
          apiKey: config.deepseek.apiKey,
          baseURL: config.deepseek.baseURL,
        })
      : null

    this.systemModelScope = config.modelscope.apiKey
      ? new OpenAI({
          apiKey: config.modelscope.apiKey,
          baseURL: config.modelscope.baseURL,
        })
      : null

    logger.debug(`${this.serviceName}: Initialized`, {
      hasSystemDeepSeek: !!this.systemDeepSeek,
      hasSystemModelScope: !!this.systemModelScope,
      userId,
    })
  }

  /**
   * 获取 AI 客户端（优先用户配置，否则使用系统配置）
   */
  private async getClient(model: AIModel): Promise<OpenAI | null> {
    const modelInfo = getModelById(model)
    if (!modelInfo) {
      logger.error(`${this.serviceName}: Invalid model`, undefined, { model })
      return null
    }

    const provider = modelInfo.provider

    // 如果有用户 ID，尝试获取用户配置的 API Key
    if (this.userId && this.supabaseClient) {
      try {
        const service = provider === 'deepseek' ? 'deepseek' : 'modelscope'
        const userConfig = await getUserApiKeyConfig(this.userId, service, this.supabaseClient)

        if (userConfig) {
          logger.debug(`${this.serviceName}: Using user API key`, { model, service })

          return new OpenAI({
            apiKey: userConfig.apiKey,
            baseURL: userConfig.baseUrl || (provider === 'deepseek' ? config.deepseek.baseURL : config.modelscope.baseURL),
          })
        }
      } catch (error) {
        logger.warn(`${this.serviceName}: Failed to get user API key, falling back to system key`, {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // 使用系统默认客户端
    logger.debug(`${this.serviceName}: Using system API key`, { model, provider })

    if (provider === 'deepseek') {
      return this.systemDeepSeek
    } else if (provider === 'modelscope') {
      return this.systemModelScope
    }

    return null
  }

  /**
   * 调用 AI 模型进行文本补全
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const { model, prompt, systemPrompt, temperature = 0.7, maxTokens = 4000, responseFormat = 'text' } = request

    logger.debug(`${this.serviceName}: Starting AI completion`, {
      model,
      temperature,
      maxTokens,
      responseFormat,
    })

    try {
      const client = await this.getClient(model)

      if (!client) {
        throw new Error('No API key configured. Please configure API key in settings or contact administrator.')
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        })
      }

      messages.push({
        role: 'user',
        content: prompt,
      })

      const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }

      // 如果需要 JSON 响应格式
      if (responseFormat === 'json_object') {
        completionOptions.response_format = { type: 'json_object' }
      }

      logger.debug(`${this.serviceName}: Calling AI model`, { model })

      const completion = await client.chat.completions.create(completionOptions)

      const content = completion.choices[0]?.message?.content || ''

      logger.info(`${this.serviceName}: AI completion successful`, {
        model,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      })

      return {
        content,
        model: completion.model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error) {
      logger.error(`${this.serviceName}: AI completion failed`, error as Error, {
        model,
        temperature,
        maxTokens,
      })
      throw error
    }
  }

  /**
   * 生成 JSON 响应（自动解析）
   */
  async generateJSON<T = unknown>(request: Omit<AICompletionRequest, 'responseFormat'>): Promise<T> {
    logger.debug(`${this.serviceName}: Generating JSON response`)

    try {
      const response = await this.complete({
        ...request,
        responseFormat: 'json_object',
      })

      const parsed = JSON.parse(response.content)

      logger.debug(`${this.serviceName}: JSON parsed successfully`)

      return parsed as T
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to generate/parse JSON`, error as Error)
      throw new Error(`Failed to generate valid JSON response: ${(error as Error).message}`)
    }
  }

  /**
   * 检查是否有可用的 API Key
   */
  async hasApiKey(model: AIModel): Promise<boolean> {
    const client = await this.getClient(model)
    return client !== null
  }

  /**
   * 获取可用的模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    const models: AIModel[] = [
      'deepseek-chat',
      'deepseek-reasoner',
      'Qwen/Qwen2.5-72B-Instruct',
    ]

    const availableModels: AIModel[] = []

    for (const model of models) {
      if (await this.hasApiKey(model)) {
        availableModels.push(model)
      }
    }

    logger.debug(`${this.serviceName}: Available models`, { count: availableModels.length, models: availableModels })

    return availableModels
  }
}
