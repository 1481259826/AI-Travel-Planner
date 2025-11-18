/**
 * API Key 管理模块类型定义
 *
 * 职责：
 * - 定义 API Key 相关的所有类型和接口
 * - 提供类型安全的数据结构
 */

import type { ApiKeyService } from '@/types/supabase'

/**
 * API Key 配置对象
 * 包含解密后的 API Key 及可选的自定义配置
 */
export interface ApiKeyConfig {
  /** 解密后的 API Key */
  apiKey: string
  /** 自定义 API Base URL（可选） */
  baseUrl?: string
  /** 额外配置（JSON 对象） */
  extraConfig?: Record<string, unknown> | null
}

/**
 * API Key 测试配置
 * 定义如何测试一个 API Key 是否有效
 */
export interface ApiKeyTestConfig {
  /** API 测试端点 URL */
  url: string
  /** HTTP 方法 */
  method?: 'GET' | 'POST'
  /** 请求头 */
  headers: Record<string, string>
  /** 请求体（POST 请求使用） */
  body?: Record<string, any>
  /** 自定义响应验证函数 */
  validateResponse?: (response: Response, data?: any) => boolean | Promise<boolean>
}

/**
 * API Key 可用性检查结果
 */
export interface ApiKeyCheckResult {
  /** 是否可用 */
  available: boolean
  /** API Key 来源 */
  source: 'system' | 'user' | 'none'
  /** 提示信息 */
  message?: string
}

/**
 * 服务中文名称映射
 */
export const SERVICE_NAMES: Record<ApiKeyService, string> = {
  deepseek: 'DeepSeek',
  modelscope: 'ModelScope',
  map: '高德地图',
  voice: '科大讯飞语音',
} as const

/**
 * API Key 服务类型（重新导出以便统一管理）
 */
export type { ApiKeyService }
