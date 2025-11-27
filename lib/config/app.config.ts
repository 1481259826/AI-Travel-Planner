/**
 * 应用配置管理
 * 统一管理所有环境变量和配置常量
 */

import { logger } from '@/lib/logger'

/**
 * Supabase 配置
 */
export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
}

/**
 * AI 模型配置
 */
export interface AIModelConfig {
  apiKey: string
  baseURL: string
  model: string
  maxTokens: number
}

/**
 * 语音识别配置
 */
export interface VoiceConfig {
  apiKey: string
  appId: string
  apiSecret?: string
}

/**
 * 地图服务配置
 */
export interface MapConfig {
  apiKey: string
  webServiceKey: string
  securityJsCode?: string
}

/**
 * Feature Flags 配置
 */
export interface FeatureFlags {
  /** 是否使用 LangGraph 多智能体架构 */
  useLangGraph: boolean
  /** 是否启用 PWA 开发模式 */
  enablePwaDev: boolean
}

/**
 * 应用配置
 */
export interface AppConfig {
  /** 应用基础URL */
  baseUrl: string
  /** 应用名称 */
  appName: string
  /** 环境 */
  env: 'development' | 'production' | 'test'
  /** 是否为生产环境 */
  isProd: boolean
  /** 是否为开发环境 */
  isDev: boolean
  /** Supabase 配置 */
  supabase: SupabaseConfig
  /** DeepSeek 配置 */
  deepseek: AIModelConfig
  /** ModelScope 配置 */
  modelscope: AIModelConfig
  /** 语音识别配置 */
  voice: VoiceConfig
  /** 地图服务配置 */
  map: MapConfig
  /** 加密密钥 */
  encryptionKey: string
  /** Feature Flags */
  features: FeatureFlags
}

/**
 * 获取环境变量（带默认值）
 */
function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue
}

/**
 * 获取必需的环境变量（不存在则抛出错误）
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    const error = `Missing required environment variable: ${key}`
    logger.error('AppConfig', new Error(error))
    throw new Error(error)
  }
  return value
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 创建配置对象
 */
function createConfig(): AppConfig {
  const env = (getEnv('NODE_ENV', 'development') as AppConfig['env'])
  const isProd = env === 'production'
  const isDev = env === 'development'

  // Supabase 配置（必需）
  // 直接访问环境变量以支持 Next.js 的静态替换
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !isValidUrl(supabaseUrl)) {
    logger.warn('AppConfig: Invalid or missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    logger.warn('AppConfig: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // AI 模型配置（可选，但至少需要一个）
  const deepseekApiKey = getEnv('DEEPSEEK_API_KEY')
  const modelscopeApiKey = getEnv('MODELSCOPE_API_KEY')

  if (!deepseekApiKey && !modelscopeApiKey) {
    logger.warn('AppConfig: No AI model API keys configured (DeepSeek or ModelScope)')
  }

  // 地图配置（必需）
  // 直接访问 NEXT_PUBLIC_* 环境变量以支持 Next.js 的静态替换
  const mapApiKey = process.env.NEXT_PUBLIC_MAP_API_KEY || ''
  const mapWebServiceKey = getEnv('AMAP_WEB_SERVICE_KEY')

  if (!mapApiKey) {
    logger.warn('AppConfig: Missing NEXT_PUBLIC_MAP_API_KEY')
  }

  if (!mapWebServiceKey) {
    logger.warn('AppConfig: Missing AMAP_WEB_SERVICE_KEY')
  }

  // 加密密钥（必需）
  const encryptionKey = getEnv('ENCRYPTION_KEY')

  if (!encryptionKey) {
    logger.warn('AppConfig: Missing ENCRYPTION_KEY')
  } else if (encryptionKey.length < 32) {
    logger.warn('AppConfig: ENCRYPTION_KEY should be at least 32 characters for AES-256')
  }

  const config: AppConfig = {
    // 直接访问 NEXT_PUBLIC_* 环境变量以支持 Next.js 的静态替换
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || (isProd ? '' : 'http://localhost:3008'),
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'AI Travel Planner',
    env,
    isProd,
    isDev,

    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },

    deepseek: {
      apiKey: deepseekApiKey,
      baseURL: getEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
      model: getEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
      maxTokens: parseInt(getEnv('DEEPSEEK_MAX_TOKENS', '8000')),
    },

    modelscope: {
      apiKey: modelscopeApiKey,
      baseURL: getEnv('MODELSCOPE_BASE_URL', 'https://api-inference.modelscope.cn/v1/'),
      model: getEnv('MODELSCOPE_MODEL', 'Qwen/Qwen2.5-72B-Instruct'),
      maxTokens: parseInt(getEnv('MODELSCOPE_MAX_TOKENS', '8000')),
    },

    voice: {
      apiKey: getEnv('VOICE_API_KEY'),
      appId: getEnv('VOICE_APP_ID'),
      apiSecret: getEnv('VOICE_API_SECRET'),
    },

    map: {
      apiKey: mapApiKey,
      webServiceKey: mapWebServiceKey,
      // 直接访问 NEXT_PUBLIC_* 环境变量
      securityJsCode: process.env.NEXT_PUBLIC_MAP_SECURITY_KEY || '',
    },

    encryptionKey,

    features: {
      // 是否使用 LangGraph 多智能体架构（默认关闭，可通过环境变量开启）
      // 使用 NEXT_PUBLIC_ 前缀以便前端可以访问
      useLangGraph: (process.env.NEXT_PUBLIC_USE_LANGGRAPH || 'false').toLowerCase() === 'true',
      // 是否启用 PWA 开发模式
      enablePwaDev: getEnv('ENABLE_PWA_DEV', 'false').toLowerCase() === 'true',
    },
  }

  return config
}

/**
 * 验证配置
 */
function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证必需配置
  if (!config.supabase.url) {
    errors.push('Supabase URL is required')
  }

  if (!config.supabase.anonKey) {
    errors.push('Supabase anon key is required')
  }

  if (!config.deepseek.apiKey && !config.modelscope.apiKey) {
    errors.push('At least one AI model API key is required (DeepSeek or ModelScope)')
  }

  if (!config.map.apiKey) {
    errors.push('Map API key is required')
  }

  if (!config.map.webServiceKey) {
    errors.push('Map Web Service key is required')
  }

  if (!config.encryptionKey) {
    errors.push('Encryption key is required')
  } else if (config.encryptionKey.length < 32) {
    errors.push('Encryption key must be at least 32 characters')
  }

  // 验证 URL 格式
  if (config.supabase.url && !isValidUrl(config.supabase.url)) {
    errors.push('Supabase URL is invalid')
  }

  if (config.baseUrl && !isValidUrl(config.baseUrl)) {
    errors.push('Base URL is invalid')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 导出配置实例
 */
export const appConfig = createConfig()

/**
 * 在启动时验证配置
 */
const validation = validateConfig(appConfig)

if (!validation.isValid) {
  logger.warn('AppConfig: Configuration validation failed', { errors: validation.errors })

  if (appConfig.isProd) {
    // 生产环境配置错误应该抛出异常
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
  }
}

// 启动时日志
logger.info('AppConfig: Configuration loaded', {
  env: appConfig.env,
  hasSupabase: !!appConfig.supabase.url && !!appConfig.supabase.anonKey,
  hasDeepSeek: !!appConfig.deepseek.apiKey,
  hasModelScope: !!appConfig.modelscope.apiKey,
  hasMap: !!appConfig.map.apiKey && !!appConfig.map.webServiceKey,
  hasEncryption: !!appConfig.encryptionKey && appConfig.encryptionKey.length >= 32,
  features: appConfig.features,
})

/**
 * 默认导出（向后兼容旧的 config）
 */
export default {
  supabase: appConfig.supabase,
  deepseek: appConfig.deepseek,
  modelscope: appConfig.modelscope,
  voice: appConfig.voice,
  map: appConfig.map,
}
