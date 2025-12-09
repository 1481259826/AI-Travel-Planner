/**
 * 行程修改预览缓存管理
 * 用于存储待确认的修改预览，支持自动过期
 */

import type { ModificationPreview } from './types'
import type { Itinerary } from '@/types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 缓存条目
 */
interface CacheEntry {
  /** 修改预览 */
  preview: ModificationPreview
  /** 修改后的完整行程（用于确认时保存） */
  afterItinerary: Itinerary
  /** 创建时间 */
  createdAt: number
}

// ============================================================================
// 缓存配置
// ============================================================================

/** 缓存过期时间（10分钟） */
const CACHE_TTL_MS = 10 * 60 * 1000

/** 清理间隔（1分钟） */
const CLEANUP_INTERVAL_MS = 60 * 1000

// ============================================================================
// 缓存管理类
// ============================================================================

/**
 * 修改预览缓存
 * 使用内存存储，支持自动过期清理
 */
class ModificationCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    // 启动定期清理
    this.startCleanupTimer()
  }

  /**
   * 存储修改预览
   */
  set(id: string, entry: { preview: ModificationPreview; afterItinerary: Itinerary }): void {
    this.cache.set(id, {
      ...entry,
      createdAt: Date.now(),
    })
  }

  /**
   * 获取修改预览
   * 如果已过期返回 null
   */
  get(id: string): CacheEntry | null {
    const entry = this.cache.get(id)
    if (!entry) {
      return null
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(id)
      return null
    }

    return entry
  }

  /**
   * 删除修改预览
   */
  delete(id: string): boolean {
    return this.cache.delete(id)
  }

  /**
   * 检查是否存在
   */
  has(id: string): boolean {
    const entry = this.get(id)
    return entry !== null
  }

  /**
   * 获取用户的所有待确认修改
   */
  getByUserId(userId: string): CacheEntry[] {
    const entries: CacheEntry[] = []
    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry)) {
        // 由于 preview 中没有 userId，这里暂时返回所有
        // 实际使用时可以在 preview 中添加 userId 字段
        entries.push(entry)
      }
    }
    return entries
  }

  /**
   * 更新修改预览状态
   */
  updateStatus(id: string, status: ModificationPreview['status']): boolean {
    const entry = this.get(id)
    if (!entry) {
      return false
    }

    entry.preview.status = status
    return true
  }

  /**
   * 获取缓存统计
   */
  getStats(): { total: number; expired: number } {
    let expired = 0
    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expired++
      }
    }
    return {
      total: this.cache.size,
      expired,
    }
  }

  /**
   * 清理所有过期条目
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [id, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(id)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 销毁缓存（停止清理定时器）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry, now: number = Date.now()): boolean {
    return now - entry.createdAt > CACHE_TTL_MS
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    // 仅在服务器端运行
    if (typeof window !== 'undefined') {
      return
    }

    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
        console.log(`[ModificationCache] Cleaned ${cleaned} expired entries`)
      }
    }, CLEANUP_INTERVAL_MS)

    // 确保进程退出时清理
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }
}

// ============================================================================
// 导出单例
// ============================================================================

/**
 * 全局修改预览缓存实例
 */
export const modificationCache = new ModificationCache()

/**
 * 生成唯一修改 ID
 */
export function generateModificationId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 计算过期时间
 */
export function calculateExpiresAt(createdAt: number = Date.now()): number {
  return createdAt + CACHE_TTL_MS
}

export default modificationCache
