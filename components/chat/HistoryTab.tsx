/**
 * HistoryTab 组件
 * 历史记录选项卡（包含筛选器和列表）
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Search,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HistoryList } from './HistoryList'
import { useTripHistory } from '@/hooks/useTripHistory'
import type { HistoryFilters, HistoryStatus } from '@/lib/trip-history'
import type { TripFormData } from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

interface HistoryTabProps {
  /** 复用回调：将历史记录的表单数据传递给父组件 */
  onReuse: (formData: TripFormData) => void
}

// ============================================================================
// 筛选器组件
// ============================================================================

interface HistoryFiltersBarProps {
  filters: HistoryFilters
  onFiltersChange: (filters: HistoryFilters) => void
  onRefresh: () => void
  isLoading: boolean
}

function HistoryFiltersBar({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading,
}: HistoryFiltersBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchText, setSearchText] = useState(filters.destination || '')

  // 状态选项
  const statusOptions: { value: HistoryStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'generating', label: '生成中' },
  ]

  // 处理搜索
  const handleSearch = useCallback(() => {
    onFiltersChange({
      ...filters,
      destination: searchText.trim() || undefined,
    })
  }, [filters, searchText, onFiltersChange])

  // 处理状态筛选
  const handleStatusChange = useCallback((status: HistoryStatus | 'all') => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status,
    })
  }, [filters, onFiltersChange])

  // 清除筛选
  const handleClearFilters = useCallback(() => {
    setSearchText('')
    onFiltersChange({})
  }, [onFiltersChange])

  // 是否有活动筛选
  const hasActiveFilters = !!(filters.destination || (filters.status && filters.status !== 'all'))

  return (
    <div className="space-y-2 mb-3">
      {/* 搜索和工具栏 */}
      <div className="flex items-center gap-2">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索目的地..."
            className="w-full h-8 pl-8 pr-3 text-sm border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        {/* 筛选按钮 */}
        <Button
          size="sm"
          variant={showFilters ? 'default' : 'ghost'}
          onClick={() => setShowFilters(!showFilters)}
          className="h-8"
        >
          <Filter className="w-4 h-4" />
        </Button>

        {/* 刷新按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
          {/* 状态筛选 */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
              状态
            </label>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    (filters.status || 'all') === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 清除筛选 */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* 活动筛选标签 */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.destination && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {filters.destination}
              <button
                type="button"
                onClick={() => {
                  setSearchText('')
                  onFiltersChange({ ...filters, destination: undefined })
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status && filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
              {statusOptions.find((o) => o.value === filters.status)?.label}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, status: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 主组件实现
// ============================================================================

export function HistoryTab({ onReuse }: HistoryTabProps) {
  const {
    records,
    total,
    hasMore,
    isLoading,
    error,
    filters,
    refresh,
    loadMore,
    setFilters,
    deleteRecord,
    getRecordDetail,
  } = useTripHistory()

  return (
    <div className="h-full flex flex-col">
      {/* 筛选器 */}
      <div className="flex-shrink-0 px-2">
        <HistoryFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={refresh}
          isLoading={isLoading}
        />
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: 'thin' }}>
        <HistoryList
          records={records}
          isLoading={isLoading}
          hasMore={hasMore}
          error={error}
          onLoadMore={loadMore}
          onRefresh={refresh}
          onDelete={deleteRecord}
          onReuse={onReuse}
          onGetDetail={getRecordDetail}
        />
      </div>

      {/* 底部统计 */}
      {total > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-t dark:border-gray-700 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            共 {total} 条历史行程
          </span>
        </div>
      )}
    </div>
  )
}

export default HistoryTab
