/**
 * API Key 可用性检查器模块
 *
 * 职责：
 * - 检查用户和系统的 API Key 可用性
 * - 提供针对特定服务的检查方法
 * - 返回友好的提示信息
 */

import type { ApiKeyService, ApiKeyCheckResult } from './types'
import { SERVICE_NAMES } from './types'
import { logger } from '@/lib/logger'

/**
 * API Key 检查器类
 * 提供检查 API Key 可用性的静态方法
 */
export class ApiKeyChecker {
  /**
   * 检查指定服务的 API Key 是否可用
   *
   * @param service - 服务类型
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns API Key 可用性结果
   *
   * @example
   * ```typescript
   * const result = await ApiKeyChecker.checkAvailability('deepseek', userId, token)
   * if (!result.available) {
   *   console.log(result.message)
   * }
   * ```
   */
  static async checkAvailability(
    service: ApiKeyService,
    userId?: string,
    token?: string
  ): Promise<ApiKeyCheckResult> {
    try {
      // 优先检查用户自定义 Key
      if (userId && token) {
        const userResponse = await fetch('/api/user/api-keys', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (userResponse.ok) {
          const result = await userResponse.json()
          const apiKeys = result.data?.apiKeys || []
          const userKey = apiKeys.find(
            (key: any) => key.service === service && key.is_active
          )

          if (userKey) {
            return {
              available: true,
              source: 'user',
              message: `使用您的自定义 ${SERVICE_NAMES[service]} Key`,
            }
          }
        }
      }

      // 检查系统默认 Key
      const systemResponse = await fetch('/api/user/api-keys/system', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (systemResponse.ok) {
        const result = await systemResponse.json()
        const systemKeys = result.data?.systemKeys || result.systemKeys || []
        const systemKey = systemKeys.find((key: any) => key.service === service)

        if (systemKey) {
          return {
            available: true,
            source: 'system',
            message: `使用系统默认 ${SERVICE_NAMES[service]} Key`,
          }
        }
      }

      // 都没有配置
      return {
        available: false,
        source: 'none',
        message: `未配置 ${SERVICE_NAMES[service]} API Key`,
      }
    } catch (error) {
      logger.error('检查 API Key 可用性失败', error as Error, { service })
      return {
        available: false,
        source: 'none',
        message: `检查 ${SERVICE_NAMES[service]} API Key 失败`,
      }
    }
  }

  /**
   * 检查 DeepSeek Key 是否配置（必需）
   *
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns 是否可用及提示信息
   *
   * @example
   * ```typescript
   * const { available, message } = await ApiKeyChecker.checkDeepSeekRequired(userId, token)
   * if (!available) {
   *   alert(message)
   * }
   * ```
   */
  static async checkDeepSeekRequired(
    userId?: string,
    token?: string
  ): Promise<{ available: boolean; message: string }> {
    const result = await this.checkAvailability('deepseek', userId, token)

    if (!result.available) {
      return {
        available: false,
        message:
          'DeepSeek API Key 未配置！这是系统必需的服务，请在设置页面添加 DeepSeek API Key 后再创建行程。',
      }
    }

    return {
      available: true,
      message: result.message || '使用 DeepSeek API Key',
    }
  }

  /**
   * 检查 ModelScope Key 是否配置（可选）
   *
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns 是否可用及提示信息
   *
   * @example
   * ```typescript
   * const { available, message } = await ApiKeyChecker.checkModelScopeOptional(userId, token)
   * ```
   */
  static async checkModelScopeOptional(
    userId?: string,
    token?: string
  ): Promise<{ available: boolean; message: string }> {
    const result = await this.checkAvailability('modelscope', userId, token)

    if (!result.available) {
      return {
        available: false,
        message:
          '未配置 ModelScope API Key，将无法使用 Qwen 模型。您可以在设置页面添加 ModelScope API Key。',
      }
    }

    return {
      available: true,
      message: result.message || '使用 ModelScope API Key',
    }
  }

  /**
   * 检查地图 Key 是否配置（可选但建议）
   *
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns 是否可用及提示信息
   *
   * @example
   * ```typescript
   * const { available, message } = await ApiKeyChecker.checkMapOptional(userId, token)
   * ```
   */
  static async checkMapOptional(
    userId?: string,
    token?: string
  ): Promise<{ available: boolean; message: string }> {
    const result = await this.checkAvailability('map', userId, token)

    if (!result.available) {
      return {
        available: false,
        message:
          '未配置地图 API Key，地图功能将不可用。您可以在设置页面添加高德地图 API Key 以使用地图功能。',
      }
    }

    return {
      available: true,
      message: result.message || '使用地图 API Key',
    }
  }

  /**
   * 检查语音 Key 是否配置（可选）
   *
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns 是否可用及提示信息
   *
   * @example
   * ```typescript
   * const { available, message } = await ApiKeyChecker.checkVoiceOptional(userId, token)
   * ```
   */
  static async checkVoiceOptional(
    userId?: string,
    token?: string
  ): Promise<{ available: boolean; message: string }> {
    const result = await this.checkAvailability('voice', userId, token)

    if (!result.available) {
      return {
        available: false,
        message:
          '未配置语音识别 API Key，将使用浏览器原生语音识别（仅支持部分浏览器）。您可以在设置页面添加科大讯飞 API Key 以获得更好的语音识别效果。',
      }
    }

    return {
      available: true,
      message: result.message || '使用语音 API Key',
    }
  }

  /**
   * 检查所有 API Key 的配置状态
   *
   * @param userId - 用户 ID（可选）
   * @param token - 用户认证 token（可选）
   * @returns 所有服务的可用性状态
   *
   * @example
   * ```typescript
   * const status = await ApiKeyChecker.checkAllKeys(userId, token)
   * console.log('DeepSeek:', status.deepseek.available)
   * console.log('Map:', status.map.available)
   * ```
   */
  static async checkAllKeys(
    userId?: string,
    token?: string
  ): Promise<Record<ApiKeyService, ApiKeyCheckResult>> {
    const services: ApiKeyService[] = ['deepseek', 'modelscope', 'map', 'voice']

    const results = await Promise.all(
      services.map((service) => this.checkAvailability(service, userId, token))
    )

    return services.reduce(
      (acc, service, index) => {
        acc[service] = results[index]
        return acc
      },
      {} as Record<ApiKeyService, ApiKeyCheckResult>
    )
  }

  /**
   * 检查系统默认 API Key 的配置状态
   *
   * @returns 系统默认 Key 的可用性状态
   *
   * @example
   * ```typescript
   * const systemStatus = await ApiKeyChecker.checkSystemKeys()
   * ```
   */
  static async checkSystemKeys(): Promise<Record<ApiKeyService, ApiKeyCheckResult>> {
    // 不传递 userId 和 token，只检查系统配置
    return this.checkAllKeys()
  }
}
