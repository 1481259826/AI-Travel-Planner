/**
 * HistoryItem 组件
 * 单条历史记录卡片
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MoreVertical,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TripHistoryListItem } from '@/lib/trip-history'
import { HISTORY_STATUS_CONFIG } from '@/lib/trip-history'

// ============================================================================
// 类型定义
// ============================================================================

interface HistoryItemProps {
  /** 历史记录 */
  record: TripHistoryListItem
  /** 复用回调 */
  onReuse: () => void
  /** 删除回调 */
  onDelete: () => Promise<void>
  /** 查看行程回调（仅成功时可用） */
  onViewTrip?: () => void
}

// ============================================================================
// 组件实现
// ============================================================================

export function HistoryItem({
  record,
  onReuse,
  onDelete,
  onViewTrip,
}: HistoryItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 状态配置
  const statusConfig = {
    pending: { icon: Loader2, spin: true },
    generating: { icon: Loader2, spin: true },
    completed: { icon: CheckCircle, spin: false },
    failed: { icon: XCircle, spin: false },
  }

  const status = HISTORY_STATUS_CONFIG[record.status]
  const StatusIcon = statusConfig[record.status].icon
  const isSpinning = statusConfig[record.status].spin

  // 计算天数
  const totalDays = Math.ceil(
    (new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  // 删除处理
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
      setShowMenu(false)
    }
  }

  return (
    <div className="group bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
      {/* 头部：目的地和状态 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {record.destination}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
            {totalDays}日游
          </span>
        </div>

        {/* 状态标签 */}
        <div className={`flex items-center gap-1 text-sm flex-shrink-0 ${status.color}`}>
          <StatusIcon className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{status.label}</span>
        </div>
      </div>

      {/* 信息行 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {format(new Date(record.startDate), 'MM/dd', { locale: zhCN })} -
            {format(new Date(record.endDate), 'MM/dd', { locale: zhCN })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5" />
          <span>¥{record.budget.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{record.travelers}人</span>
        </div>
        {record.generationDurationMs && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.round(record.generationDurationMs / 1000)}秒</span>
          </div>
        )}
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {format(new Date(record.createdAt), 'yyyy/MM/dd HH:mm', { locale: zhCN })}
        </span>

        <div className="flex items-center gap-2">
          {/* 查看行程（仅成功时） */}
          {record.status === 'completed' && record.tripId && onViewTrip && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onViewTrip()
              }}
              className="h-7 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              查看
            </Button>
          )}

          {/* 复用按钮 */}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onReuse()
            }}
            className="h-7 text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            复用
          </Button>

          {/* 更多菜单 */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                {/* 遮罩层 */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                  }}
                />
                {/* 下拉菜单 */}
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryItem
