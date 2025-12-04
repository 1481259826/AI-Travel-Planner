/**
 * MCP 客户端工厂
 *
 * 提供统一的 MCP 客户端创建接口，支持：
 * - 官方 MCP SSE 服务（推荐）
 * - 官方 MCP Streamable HTTP 服务
 * - 本地直接 API 调用（降级方案）
 *
 * 实现优雅降级：官方服务不可用时自动切换到直接 API
 */

import {
  AmapMCPClient,
  createAmapMCPClient,
  type AmapMCPClientConfig,
  type MCPConnectionMode,
} from './mcp-sse-client'
import { AmapMCPTools, type IMCPTools, type IExtendedMCPTools } from './mcp-tools'
import { MCPClient as DirectMCPClient } from './mcp-client'
import { appConfig } from '../config'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * MCP 客户端模式
 */
export type MCPMode =
  | 'official-sse' // 官方 SSE 服务
  | 'official-http' // 官方 Streamable HTTP 服务
  | 'direct' // 直接 API 调用

/**
 * MCP 工厂配置
 */
export interface MCPFactoryOptions {
  /** API Key */
  apiKey: string
  /** MCP 模式，默认 'official-http' (官方推荐) */
  mode?: MCPMode
  /** 是否启用降级，默认 true */
  enableFallback?: boolean
  /** 是否启用缓存，默认 true */
  enableCache?: boolean
  /** 连接超时（毫秒），默认 10000 */
  connectTimeout?: number
  /** SSE 服务 URL */
  sseUrl?: string
  /** Streamable HTTP 服务 URL */
  httpUrl?: string
}

/**
 * MCP 工厂结果
 */
export interface MCPFactoryResult {
  /** MCP 工具实例 */
  tools: IMCPTools
  /** 实际使用的模式 */
  mode: MCPMode
  /** 是否使用了降级 */
  fallback: boolean
  /** 是否为扩展接口（支持新功能） */
  extended: boolean
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_MODE: MCPMode = 'official-http'
const DEFAULT_CONNECT_TIMEOUT = 10000

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 MCP 工具实例
 *
 * 优先尝试官方 MCP 服务，失败时降级到直接 API 调用
 *
 * @example
 * ```typescript
 * // 使用官方服务（推荐）
 * const { tools, mode } = await createMCPTools({
 *   apiKey: 'your-api-key',
 * })
 *
 * // 强制使用直接 API
 * const { tools } = await createMCPTools({
 *   apiKey: 'your-api-key',
 *   mode: 'direct',
 * })
 *
 * // 禁用降级（官方服务失败时抛出错误）
 * const { tools } = await createMCPTools({
 *   apiKey: 'your-api-key',
 *   enableFallback: false,
 * })
 * ```
 */
export async function createMCPTools(
  options: MCPFactoryOptions
): Promise<MCPFactoryResult> {
  const {
    apiKey,
    mode = DEFAULT_MODE,
    enableFallback = true,
    enableCache = true,
    connectTimeout = DEFAULT_CONNECT_TIMEOUT,
    sseUrl,
    httpUrl,
  } = options

  // 直接 API 模式
  if (mode === 'direct') {
    console.log('[MCPFactory] Using direct API mode')
    return {
      tools: new DirectMCPClient({ apiKey, enableCache }),
      mode: 'direct',
      fallback: false,
      extended: false,
    }
  }

  // 尝试官方 MCP 服务
  try {
    console.log('[MCPFactory] Attempting official MCP service (mode: %s)', mode)

    const clientConfig: AmapMCPClientConfig = {
      apiKey,
      mode: mode === 'official-sse' ? 'sse' : 'streamable-http',
      connectTimeout,
      autoReconnect: true,
      ...(sseUrl && { sseUrl }),
      ...(httpUrl && { httpUrl }),
    }

    const client = createAmapMCPClient(clientConfig)
    await client.connect()

    console.log('[MCPFactory] Successfully connected to official MCP service')

    return {
      tools: new AmapMCPTools(client, { enableCache }),
      mode,
      fallback: false,
      extended: true, // 官方服务支持扩展功能
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.warn('[MCPFactory] Official MCP service failed:', errMsg)

    // 降级到直接 API
    if (enableFallback) {
      console.log('[MCPFactory] Falling back to direct API mode')
      return {
        tools: new DirectMCPClient({ apiKey, enableCache }),
        mode: 'direct',
        fallback: true,
        extended: false,
      }
    }

    // 不启用降级，抛出错误
    throw error
  }
}

/**
 * 创建 MCP 工具实例（同步版本，使用直接 API）
 *
 * 用于需要同步创建的场景，不连接官方 MCP 服务
 */
export function createMCPToolsSync(
  options: Pick<MCPFactoryOptions, 'apiKey' | 'enableCache'>
): MCPFactoryResult {
  return {
    tools: new DirectMCPClient({
      apiKey: options.apiKey,
      enableCache: options.enableCache,
    }),
    mode: 'direct',
    fallback: false,
    extended: false,
  }
}

// ============================================================================
// 单例管理
// ============================================================================

let mcpToolsInstance: IMCPTools | null = null
let currentMode: MCPMode | null = null
let currentExtended: boolean = false

/**
 * 获取 MCP 工具单例
 *
 * 首次调用时会尝试连接官方服务，后续调用返回缓存的实例
 */
export async function getMCPTools(
  options?: Partial<MCPFactoryOptions>
): Promise<IMCPTools> {
  if (mcpToolsInstance) {
    return mcpToolsInstance
  }

  // 获取 API Key
  const apiKey = options?.apiKey || appConfig.map.webServiceKey
  if (!apiKey) {
    throw new Error('AMap API key not configured')
  }

  // 从配置获取 MCP 模式
  const modeFromConfig = appConfig.mcp?.mode || 'official-http'
  const mode = options?.mode || modeFromConfig as MCPMode

  const result = await createMCPTools({
    apiKey,
    mode,
    enableFallback: options?.enableFallback ?? appConfig.mcp?.enableFallback ?? true,
    enableCache: options?.enableCache ?? appConfig.mcp?.cacheEnabled ?? true,
    connectTimeout: options?.connectTimeout,
    sseUrl: options?.sseUrl ?? appConfig.mcp?.sseUrl,
    httpUrl: options?.httpUrl ?? appConfig.mcp?.httpUrl,
  })

  mcpToolsInstance = result.tools
  currentMode = result.mode
  currentExtended = result.extended

  console.log(
    '[MCPFactory] Initialized MCP tools (mode: %s, fallback: %s, extended: %s)',
    result.mode,
    result.fallback,
    result.extended
  )

  return mcpToolsInstance
}

/**
 * 获取 MCP 工具单例（同步版本）
 *
 * 如果尚未初始化，使用直接 API 模式
 */
export function getMCPToolsSync(
  options?: Pick<MCPFactoryOptions, 'apiKey' | 'enableCache'>
): IMCPTools {
  if (mcpToolsInstance) {
    return mcpToolsInstance
  }

  const apiKey = options?.apiKey || appConfig.map.webServiceKey
  if (!apiKey) {
    throw new Error('AMap API key not configured')
  }

  const result = createMCPToolsSync({
    apiKey,
    enableCache: options?.enableCache ?? true,
  })

  mcpToolsInstance = result.tools
  currentMode = result.mode
  currentExtended = result.extended

  return mcpToolsInstance
}

/**
 * 获取当前 MCP 模式
 */
export function getCurrentMCPMode(): MCPMode | null {
  return currentMode
}

/**
 * 是否支持扩展功能
 */
export function isMCPExtended(): boolean {
  return currentExtended
}

/**
 * 获取扩展 MCP 工具（如果可用）
 */
export async function getExtendedMCPTools(): Promise<IExtendedMCPTools | null> {
  const tools = await getMCPTools()
  if (currentExtended) {
    return tools as IExtendedMCPTools
  }
  return null
}

/**
 * 重置 MCP 工具单例（用于测试或重新连接）
 */
export async function resetMCPTools(): Promise<void> {
  // 如果是官方客户端，断开连接
  if (mcpToolsInstance && currentMode !== 'direct') {
    try {
      // AmapMCPTools 需要获取内部 client 来断开连接
      // 这里简单地重置即可
    } catch (error) {
      console.warn('[MCPFactory] Error disconnecting:', error)
    }
  }

  mcpToolsInstance = null
  currentMode = null
  currentExtended = false

  console.log('[MCPFactory] MCP tools reset')
}

// ============================================================================
// 健康检查
// ============================================================================

/**
 * 检查 MCP 服务健康状态
 */
export async function checkMCPHealth(
  options?: Pick<MCPFactoryOptions, 'apiKey' | 'mode' | 'connectTimeout'>
): Promise<{
  healthy: boolean
  mode: MCPMode
  error?: string
  latency?: number
}> {
  const apiKey = options?.apiKey || appConfig.map.webServiceKey
  if (!apiKey) {
    return {
      healthy: false,
      mode: 'direct',
      error: 'API key not configured',
    }
  }

  const mode = options?.mode || (appConfig.mcp?.mode as MCPMode) || 'official-http'
  const startTime = Date.now()

  // 直接 API 模式总是健康的（只要 API Key 有效）
  if (mode === 'direct') {
    return {
      healthy: true,
      mode: 'direct',
      latency: 0,
    }
  }

  // 尝试连接官方服务
  try {
    const client = createAmapMCPClient({
      apiKey,
      mode: mode === 'official-sse' ? 'sse' : 'streamable-http',
      connectTimeout: options?.connectTimeout || 5000,
      autoReconnect: false,
    })

    await client.connect()
    await client.disconnect()

    return {
      healthy: true,
      mode,
      latency: Date.now() - startTime,
    }
  } catch (error) {
    return {
      healthy: false,
      mode,
      error: error instanceof Error ? error.message : String(error),
      latency: Date.now() - startTime,
    }
  }
}

// ============================================================================
// 预初始化 MCP 客户端
// ============================================================================

/**
 * 预初始化 MCP 客户端
 *
 * 在工作流开始前调用，尝试连接官方 MCP 服务
 * 如果失败，后续调用会使用直接 API 模式
 *
 * @returns 初始化结果
 */
export async function initializeMCPClient(
  options?: Partial<MCPFactoryOptions>
): Promise<MCPFactoryResult> {
  // 如果已经初始化，返回现有实例
  if (mcpToolsInstance) {
    return {
      tools: mcpToolsInstance,
      mode: currentMode!,
      fallback: false,
      extended: currentExtended,
    }
  }

  // 获取 API Key
  const apiKey = options?.apiKey || appConfig.map.webServiceKey
  if (!apiKey) {
    throw new Error('AMap API key not configured')
  }

  // 从配置获取 MCP 模式
  const modeFromConfig = appConfig.mcp?.mode || 'official-http'
  const mode = options?.mode || modeFromConfig as MCPMode

  console.log('[MCPFactory] Pre-initializing MCP client (mode: %s)...', mode)

  const result = await createMCPTools({
    apiKey,
    mode,
    enableFallback: options?.enableFallback ?? appConfig.mcp?.enableFallback ?? true,
    enableCache: options?.enableCache ?? appConfig.mcp?.cacheEnabled ?? true,
    connectTimeout: options?.connectTimeout,
    sseUrl: options?.sseUrl ?? appConfig.mcp?.sseUrl,
    httpUrl: options?.httpUrl ?? appConfig.mcp?.httpUrl,
  })

  mcpToolsInstance = result.tools
  currentMode = result.mode
  currentExtended = result.extended

  console.log(
    '[MCPFactory] MCP client initialized (mode: %s, fallback: %s, extended: %s)',
    result.mode,
    result.fallback,
    result.extended
  )

  return result
}

// ============================================================================
// 导出
// ============================================================================

export type { IMCPTools, IExtendedMCPTools }
export { AmapMCPTools } from './mcp-tools'
export { AmapMCPClient } from './mcp-sse-client'
export { MCPClient as DirectMCPClient } from './mcp-client'
