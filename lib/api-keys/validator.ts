/**
 * API Key 验证器模块
 *
 * 职责：
 * - 测试各种服务的 API Key 是否有效
 * - 提供统一的测试接口
 * - 支持自定义验证逻辑
 */

import type { ApiKeyTestConfig } from './types'
import { logger } from '@/lib/logger'

/**
 * API Key 验证器类
 * 提供测试各种服务 API Key 有效性的静态方法
 */
export class ApiKeyValidator {
  /**
   * 通用 API Key 测试函数
   *
   * @param apiKey - API Key
   * @param config - 测试配置
   * @param serviceName - 服务名称（用于日志）
   * @returns 是否有效
   *
   * @private
   */
  private static async testGeneric(
    apiKey: string,
    config: ApiKeyTestConfig,
    serviceName: string
  ): Promise<boolean> {
    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: config.headers,
        ...(config.body && { body: JSON.stringify(config.body) }),
      })

      // 如果提供了自定义验证函数，使用它
      if (config.validateResponse) {
        const data = response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : null
        return config.validateResponse(response, data)
      }

      // 默认验证：检查 HTTP 状态码
      return response.ok
    } catch (error) {
      logger.error(`测试 ${serviceName} API Key 失败`, error as Error)
      return false
    }
  }

  /**
   * 测试 Anthropic API Key 是否有效
   *
   * @param apiKey - Anthropic API Key
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testAnthropicKey('sk-ant-...')
   * ```
   */
  static async testAnthropicKey(apiKey: string): Promise<boolean> {
    return this.testGeneric(
      apiKey,
      {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        },
      },
      'Anthropic'
    )
  }

  /**
   * 测试 DeepSeek API Key 是否有效
   *
   * @param apiKey - DeepSeek API Key
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testDeepSeekKey('sk-...')
   * ```
   */
  static async testDeepSeekKey(apiKey: string): Promise<boolean> {
    return this.testGeneric(
      apiKey,
      {
        url: 'https://api.deepseek.com/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        },
      },
      'DeepSeek'
    )
  }

  /**
   * 测试 ModelScope API Key 是否有效
   *
   * @param apiKey - ModelScope API Key
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testModelScopeKey('sk-...')
   * ```
   */
  static async testModelScopeKey(apiKey: string): Promise<boolean> {
    return this.testGeneric(
      apiKey,
      {
        url: 'https://api-inference.modelscope.cn/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          model: 'Qwen/Qwen2.5-72B-Instruct',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        },
      },
      'ModelScope'
    )
  }

  /**
   * 测试高德地图 API Key 是否有效
   *
   * @param apiKey - 高德地图 Web 服务 API Key
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testMapKey('your-key')
   * ```
   */
  static async testMapKey(apiKey: string): Promise<boolean> {
    return this.testGeneric(
      apiKey,
      {
        url: `https://restapi.amap.com/v3/ip?key=${apiKey}&ip=114.247.50.2`,
        method: 'GET',
        headers: {},
        validateResponse: (response, data) => {
          if (!response.ok) return false
          // status=1 表示成功，status=0 表示失败（如 Key 无效）
          return data?.status === '1'
        },
      },
      '高德地图'
    )
  }

  /**
   * 测试科大讯飞语音 API Key 是否有效
   *
   * @param apiKey - 科大讯飞 API Key
   * @returns 是否有效
   *
   * @remarks
   * 科大讯飞的 API 需要 APPID + API Key + API Secret 组合验证，
   * 这里只做基本格式验证，实际验证需要在服务端进行完整的签名流程。
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testVoiceKey('your-key')
   * ```
   */
  static async testVoiceKey(apiKey: string): Promise<boolean> {
    try {
      // 科大讯飞的 API 需要 APPID + API Key + API Secret 组合验证
      // 这里只做基本格式验证，实际验证需要在服务端进行完整的签名流程
      // 简单验证：检查 Key 格式是否符合基本要求（非空且长度合理）
      if (!apiKey || apiKey.length < 16) {
        return false
      }

      // 实际使用时需要调用讯飞 API 进行验证
      // 由于讯飞 API 需要复杂的签名流程，这里暂时返回格式验证结果
      // 建议用户在实际使用时测试语音功能是否正常
      return true
    } catch (error) {
      logger.error('测试科大讯飞语音 API Key 失败', error as Error)
      return false
    }
  }

  /**
   * 测试指定服务的 API Key
   *
   * @param service - 服务类型
   * @param apiKey - API Key
   * @returns 是否有效
   *
   * @example
   * ```typescript
   * const isValid = await ApiKeyValidator.testKey('deepseek', 'sk-...')
   * ```
   */
  static async testKey(service: string, apiKey: string): Promise<boolean> {
    switch (service) {
      case 'anthropic':
        return this.testAnthropicKey(apiKey)
      case 'deepseek':
        return this.testDeepSeekKey(apiKey)
      case 'modelscope':
        return this.testModelScopeKey(apiKey)
      case 'map':
        return this.testMapKey(apiKey)
      case 'voice':
        return this.testVoiceKey(apiKey)
      default:
        logger.warn('未知的服务类型', { service })
        return false
    }
  }
}
