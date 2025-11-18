/**
 * API Key 客户端模块
 *
 * 职责：
 * - 从数据库获取用户的 API Key
 * - 解密加密的 API Key
 * - 提供 API Key 配置获取接口
 * - 支持自定义 Supabase 客户端
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiKeyService, ApiKeyConfig } from './types'
import { logger } from '@/lib/logger'

/**
 * API Key 客户端类
 * 提供获取和解密 API Key 的静态方法
 */
export class ApiKeyClient {
  /**
   * 获取用户指定服务的激活 API Key（仅返回解密后的 Key）
   *
   * @param userId - 用户 ID
   * @param service - 服务类型
   * @param supabaseClient - 可选的已认证 Supabase 客户端
   * @returns 解密后的 API Key，如果没有则返回 null
   *
   * @example
   * ```typescript
   * const apiKey = await ApiKeyClient.getUserKey(userId, 'deepseek')
   * if (apiKey) {
   *   // 使用 API Key
   * }
   * ```
   */
  static async getUserKey(
    userId: string,
    service: ApiKeyService,
    supabaseClient?: SupabaseClient
  ): Promise<string | null> {
    try {
      const supabase = supabaseClient || (await import('@/lib/database')).supabase
      const { decrypt } = await import('@/lib/encryption')

      // 查询用户的激活 API Key
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId)
        .eq('service', service)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!apiKey) return null

      // 解密并返回
      return decrypt(apiKey.encrypted_key)
    } catch (error) {
      logger.error('获取用户 API Key 失败', error as Error, { userId, service })
      return null
    }
  }

  /**
   * 获取用户指定服务的激活 API Key 及完整配置
   *
   * @param userId - 用户 ID
   * @param service - 服务类型
   * @param supabaseClient - 可选的已认证 Supabase 客户端
   * @returns 包含解密后的 API Key、base_url 和 extra_config 的对象
   *
   * @example
   * ```typescript
   * const config = await ApiKeyClient.getUserConfig(userId, 'deepseek')
   * if (config) {
   *   const { apiKey, baseUrl, extraConfig } = config
   *   // 使用配置
   * }
   * ```
   */
  static async getUserConfig(
    userId: string,
    service: ApiKeyService,
    supabaseClient?: SupabaseClient
  ): Promise<ApiKeyConfig | null> {
    try {
      const supabase = supabaseClient || (await import('@/lib/database')).supabase
      const { decrypt } = await import('@/lib/encryption')

      logger.debug('查询用户 API Key 配置', { userId, service })

      // 查询用户的激活 API Key
      const { data: apiKeyData, error: queryError } = await supabase
        .from('api_keys')
        .select('encrypted_key, base_url, extra_config')
        .eq('user_id', userId)
        .eq('service', service)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (queryError) {
        logger.error('查询用户 API Key 失败', queryError as Error, { userId, service })
        return null
      }

      if (!apiKeyData) {
        logger.debug('未找到用户 API Key', { userId, service })
        return null
      }

      logger.debug('找到用户 API Key', {
        userId,
        service,
        baseUrl: apiKeyData.base_url || 'not set',
      })

      // 解密 API Key
      let apiKey: string
      try {
        apiKey = decrypt(apiKeyData.encrypted_key)
      } catch (decryptError) {
        logger.warn(
          '解密用户 API Key 失败，可能是加密密钥已更改或数据损坏。将回退到系统默认配置。',
          {
            userId,
            service,
            hint: '建议在设置页面重新保存 API Key',
          }
        )
        // 解密失败时返回 null，让调用方回退到系统配置
        return null
      }

      // 解析 extra_config（如果存在）
      let extraConfig: Record<string, unknown> | null = null
      if (apiKeyData.extra_config) {
        try {
          extraConfig = JSON.parse(apiKeyData.extra_config) as Record<string, unknown>
        } catch {
          logger.warn('解析 extra_config 失败', { userId, service })
        }
      }

      return {
        apiKey,
        baseUrl: apiKeyData.base_url || undefined,
        extraConfig,
      }
    } catch (error) {
      logger.error('获取用户 API Key 配置失败', error as Error, { userId, service })
      return null
    }
  }

  /**
   * 获取系统默认 API Key
   *
   * @param service - 服务类型
   * @returns 系统配置的 API Key，如果未配置则返回 null
   *
   * @example
   * ```typescript
   * const systemKey = ApiKeyClient.getSystemKey('deepseek')
   * ```
   */
  static getSystemKey(service: ApiKeyService): string | null {
    const config = require('@/lib/config').default

    switch (service) {
      case 'deepseek':
        return config.deepseek.apiKey || null
      case 'modelscope':
        return config.modelscope.apiKey || null
      case 'map':
        return config.map.webServiceKey || null
      case 'voice':
        return config.voice.apiKey || null
      default:
        return null
    }
  }

  /**
   * 获取 API Key（优先用户自定义，回退到系统默认）
   *
   * @param userId - 用户 ID
   * @param service - 服务类型
   * @param supabaseClient - 可选的已认证 Supabase 客户端
   * @returns API Key，如果都没有配置则返回 null
   *
   * @example
   * ```typescript
   * const apiKey = await ApiKeyClient.getKeyWithFallback(userId, 'deepseek')
   * if (!apiKey) {
   *   throw new Error('DeepSeek API Key 未配置')
   * }
   * ```
   */
  static async getKeyWithFallback(
    userId: string,
    service: ApiKeyService,
    supabaseClient?: SupabaseClient
  ): Promise<string | null> {
    // 优先使用用户配置
    const userKey = await this.getUserKey(userId, service, supabaseClient)
    if (userKey) {
      logger.debug('使用用户自定义 API Key', { userId, service })
      return userKey
    }

    // 回退到系统配置
    const systemKey = this.getSystemKey(service)
    if (systemKey) {
      logger.debug('使用系统默认 API Key', { userId, service })
      return systemKey
    }

    logger.warn('未找到可用的 API Key', { userId, service })
    return null
  }

  /**
   * 获取 API Key 配置（优先用户自定义，回退到系统默认）
   *
   * @param userId - 用户 ID
   * @param service - 服务类型
   * @param supabaseClient - 可选的已认证 Supabase 客户端
   * @returns API Key 配置对象
   *
   * @example
   * ```typescript
   * const config = await ApiKeyClient.getConfigWithFallback(userId, 'deepseek')
   * if (!config) {
   *   throw new Error('DeepSeek API Key 未配置')
   * }
   * ```
   */
  static async getConfigWithFallback(
    userId: string,
    service: ApiKeyService,
    supabaseClient?: SupabaseClient
  ): Promise<ApiKeyConfig | null> {
    // 优先使用用户配置
    const userConfig = await this.getUserConfig(userId, service, supabaseClient)
    if (userConfig) {
      logger.debug('使用用户自定义 API Key 配置', { userId, service })
      return userConfig
    }

    // 回退到系统配置
    const systemKey = this.getSystemKey(service)
    if (systemKey) {
      logger.debug('使用系统默认 API Key', { userId, service })
      const config = require('@/lib/config').default

      let baseUrl: string | undefined
      switch (service) {
        case 'deepseek':
          baseUrl = config.deepseek.baseURL
          break
        case 'modelscope':
          baseUrl = config.modelscope.baseURL
          break
        default:
          baseUrl = undefined
      }

      return {
        apiKey: systemKey,
        baseUrl,
        extraConfig: null,
      }
    }

    logger.warn('未找到可用的 API Key 配置', { userId, service })
    return null
  }
}
