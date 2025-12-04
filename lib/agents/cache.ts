/**
 * MCP 客户端缓存模块
 * 用于缓存高德 API 调用结果，减少重复请求
 */

import crypto from 'crypto'

// ============================================================================
// 缓存配置
// ============================================================================

/**
 * 缓存 TTL 配置（毫秒）
 */
export const CACHE_TTL = {
  /** 天气数据：30 分钟 */
  WEATHER: 30 * 60 * 1000,
  /** POI 搜索：6 小时 */
  POI_SEARCH: 6 * 60 * 60 * 1000,
  /** 周边搜索：6 小时 */
  NEARBY_SEARCH: 6 * 60 * 60 * 1000,
  /** POI 详情：24 小时 */
  POI_DETAIL: 24 * 60 * 60 * 1000,
  /** 路线规划：2 小时 */
  ROUTE: 2 * 60 * 60 * 1000,
  /** 地理编码：24 小时 */
  GEOCODE: 24 * 60 * 60 * 1000,
  /** 距离计算：24 小时 */
  DISTANCE: 24 * 60 * 60 * 1000,
} as const

/**
 * 缓存类型
 */
export type CacheType = keyof typeof CACHE_TTL

// ============================================================================
// 缓存条目类型
// ============================================================================

interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

// ============================================================================
// 缓存统计
// ============================================================================

interface CacheStats {
  hits: number
  misses: number
  size: number
  evictions: number
}

// ============================================================================
// 缓存类
// ============================================================================

/**
 * 通用内存缓存
 * 支持 TTL 过期和缓存统计
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
  }
  private readonly maxSize: number
  private readonly defaultTTL: number

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize ?? 1000
    this.defaultTTL = options.defaultTTL ?? CACHE_TTL.POI_SEARCH
  }

  /**
   * 生成缓存键
   * @param type 缓存类型
   * @param params 请求参数
   */
  static generateKey(type: CacheType, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key]
          return acc
        },
        {} as Record<string, unknown>
      )

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex')
      .substring(0, 12)

    return `${type}:${hash}`
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.size--
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.value
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    // 检查是否需要清理
    if (this.cache.size >= this.maxSize) {
      this.evictExpired()

      // 如果仍然超过限制，删除最旧的条目
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value
        if (oldestKey) {
          this.cache.delete(oldestKey)
          this.stats.evictions++
          this.stats.size--
        }
      }
    }

    const now = Date.now()
    this.cache.set(key, {
      value,
      expiresAt: now + (ttl ?? this.defaultTTL),
      createdAt: now,
    })
    this.stats.size = this.cache.size
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.stats.size--
    }
    return result
  }

  /**
   * 清理所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats.size = 0
  }

  /**
   * 清理过期缓存
   */
  evictExpired(): number {
    const now = Date.now()
    let evicted = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        evicted++
      }
    }

    this.stats.evictions += evicted
    this.stats.size = this.cache.size
    return evicted
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? this.stats.hits / total : 0

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.evictions = 0
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size
  }
}

// ============================================================================
// MCP 缓存实例
// ============================================================================

/**
 * 全局 MCP 缓存实例
 */
let mcpCacheInstance: MemoryCache | null = null

/**
 * 获取 MCP 缓存实例（单例）
 */
export function getMCPCache(): MemoryCache {
  if (!mcpCacheInstance) {
    mcpCacheInstance = new MemoryCache({
      maxSize: 500,
      defaultTTL: CACHE_TTL.POI_SEARCH,
    })
  }
  return mcpCacheInstance
}

/**
 * 重置 MCP 缓存（用于测试）
 */
export function resetMCPCache(): void {
  if (mcpCacheInstance) {
    mcpCacheInstance.clear()
  }
  mcpCacheInstance = null
}

// ============================================================================
// 缓存装饰器辅助函数
// ============================================================================

/**
 * 带缓存的异步函数执行
 * @param cacheType 缓存类型
 * @param params 请求参数（用于生成缓存键）
 * @param fn 原始函数
 */
export async function withCache<T>(
  cacheType: CacheType,
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const cache = getMCPCache()
  const key = MemoryCache.generateKey(cacheType, params)

  // 尝试从缓存获取
  const cached = cache.get(key) as T | null
  if (cached !== null) {
    console.log(`[Cache] HIT: ${cacheType} (${key.substring(0, 20)}...)`)
    return cached
  }

  // 执行原始函数
  console.log(`[Cache] MISS: ${cacheType} (${key.substring(0, 20)}...)`)
  const result = await fn()

  // 存入缓存（只缓存非空结果）
  if (result !== null && result !== undefined) {
    cache.set(key, result, CACHE_TTL[cacheType])
  }

  return result
}

/**
 * 打印缓存统计信息
 */
export function logCacheStats(): void {
  const cache = getMCPCache()
  const stats = cache.getStats()
  console.log('[Cache] Stats:', {
    size: stats.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
    evictions: stats.evictions,
  })
}
