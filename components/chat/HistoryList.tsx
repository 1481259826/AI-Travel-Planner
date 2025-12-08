/**
 * HistoryList 组件
 * 历史记录列表
 */

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, History, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HistoryItem } from './HistoryItem'
import type { TripHistoryListItem, TripGenerationRecord } from '@/lib/trip-history'
import type { TripFormData } from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

interface HistoryListProps {
  /** 历史记录列表 */
  records: TripHistoryListItem[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否有更多数据 */
  hasMore: boolean
  /** 错误信息 */
  error: string | null
  /** 加载更多回调 */
  onLoadMore: () => void
  /** 刷新回调 */
  onRefresh: () => void
  /** 删除回调 */
  onDelete: (id: string) => Promise<void>
  /** 复用回调 */
  onReuse: (formData: TripFormData) => void
  /** 获取详情回调 */
  onGetDetail: (id: string) => Promise<TripGenerationRecord | null>
}

// ============================================================================
// 组件实现
// ============================================================================

export function HistoryList({
  records,
  isLoading,
  hasMore,
  error,
  onLoadMore,
  onRefresh,
  onDelete,
  onReuse,
  onGetDetail,
}: HistoryListProps) {
  const router = useRouter()

  /**
   * 处理复用
   */
  const handleReuse = useCallback(async (record: TripHistoryListItem) => {
    // 获取完整记录以获取 formData
    const detail = await onGetDetail(record.id)
    if (detail) {
      onReuse(detail.formData)
    }
  }, [onGetDetail, onReuse])

  /**
   * 处理查看行程
   */
  const handleViewTrip = useCallback((tripId: string) => {
    router.push(`/dashboard/trips/${tripId}`)
  }, [router])

  // 加载中状态（初始加载）
  if (isLoading && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          加载中...
        </p>
      </div>
    )
  }

  // 错误状态
  if (error && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    )
  }

  // 空状态
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          暂无历史行程
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          创建行程后会显示在这里
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 列表 */}
      {records.map((record) => (
        <HistoryItem
          key={record.id}
          record={record}
          onReuse={() => handleReuse(record)}
          onDelete={() => onDelete(record.id)}
          onViewTrip={
            record.tripId
              ? () => handleViewTrip(record.tripId!)
              : undefined
          }
        />
      ))}

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                加载中...
              </>
            ) : (
              '加载更多'
            )}
          </Button>
        </div>
      )}

      {/* 底部提示 */}
      {!hasMore && records.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">
          已显示全部 {records.length} 条历史行程
        </p>
      )}
    </div>
  )
}

export default HistoryList
