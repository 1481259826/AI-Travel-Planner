/**
 * ItineraryReviewPanel - 行程审核面板
 * 在行程骨架生成后，允许用户审核和修改景点
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  MapPin,
  Clock,
  Trash2,
  Plus,
  RotateCcw,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  ItineraryReviewOptions,
  ItineraryReviewDecision,
  AttractionModification,
} from '@/lib/agents/state-hitl'
import type { DraftItinerary, DraftDay, AttractionSlot } from '@/lib/agents/state'

// ============================================================================
// 类型定义
// ============================================================================

interface ItineraryReviewPanelProps {
  /** 审核选项数据 */
  options: ItineraryReviewOptions
  /** 是否正在提交 */
  isSubmitting?: boolean
  /** 提交决策回调 */
  onDecision: (decision: ItineraryReviewDecision) => void
  /** 取消回调 */
  onCancel: () => void
}

interface DayCardProps {
  day: DraftDay
  dayIndex: number
  isExpanded: boolean
  onToggle: () => void
  onRemoveAttraction: (attractionIndex: number) => void
  onReorderAttraction: (fromIndex: number, toIndex: number) => void
}

interface AttractionItemProps {
  attraction: AttractionSlot
  index: number
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * 单个景点项
 */
function AttractionItem({
  attraction,
  index,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: AttractionItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border dark:border-gray-600 group">
      {/* 拖拽手柄 */}
      <div className="flex flex-col gap-0.5 cursor-grab text-gray-400">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 序号 */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium flex items-center justify-center">
        {index + 1}
      </div>

      {/* 景点信息 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {attraction.name}
        </h4>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
          {attraction.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {attraction.duration}
            </span>
          )}
          {attraction.type && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-xs">
              {attraction.type}
            </span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveUp}
          disabled={isFirst}
          title="上移"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveDown}
          disabled={isLast}
          title="下移"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={onRemove}
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * 单天卡片
 */
function DayCard({
  day,
  dayIndex,
  isExpanded,
  onToggle,
  onRemoveAttraction,
  onReorderAttraction,
}: DayCardProps) {
  const attractionsCount = day.attractions.length

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 日期头部 */}
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
            D{dayIndex + 1}
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">
              第 {dayIndex + 1} 天
              {day.date && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({day.date})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {attractionsCount} 个景点
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* 景点列表 */}
      {isExpanded && (
        <div className="p-4 space-y-2 bg-gray-50/50 dark:bg-gray-800/50">
          {day.attractions.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无景点安排</p>
            </div>
          ) : (
            day.attractions.map((attraction, idx) => (
              <AttractionItem
                key={`${dayIndex}-${idx}-${attraction.name}`}
                attraction={attraction}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === day.attractions.length - 1}
                onRemove={() => onRemoveAttraction(idx)}
                onMoveUp={() => onReorderAttraction(idx, idx - 1)}
                onMoveDown={() => onReorderAttraction(idx, idx + 1)}
              />
            ))
          )}

          {/* 添加景点按钮（预留，暂未实现搜索功能） */}
          <button
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            onClick={() => {
              // TODO: 打开景点搜索/添加对话框
              console.log('添加景点功能待实现')
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">添加景点</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ItineraryReviewPanel({
  options,
  isSubmitting = false,
  onDecision,
  onCancel,
}: ItineraryReviewPanelProps) {
  const { draftItinerary, weatherWarnings } = options

  // 本地状态：跟踪用户的修改
  const [localItinerary, setLocalItinerary] = useState<DraftItinerary>(draftItinerary)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    // 默认展开前两天
    new Set([0, 1])
  )
  const [modifications, setModifications] = useState<AttractionModification[]>([])

  // 是否有修改
  const hasModifications = modifications.length > 0

  // 统计信息
  const stats = useMemo(() => {
    const totalAttractions = localItinerary.days.reduce(
      (sum, day) => sum + day.attractions.length,
      0
    )
    return {
      totalDays: localItinerary.days.length,
      totalAttractions,
    }
  }, [localItinerary])

  // 切换展开/折叠
  const toggleDay = useCallback((dayIndex: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayIndex)) {
        next.delete(dayIndex)
      } else {
        next.add(dayIndex)
      }
      return next
    })
  }, [])

  // 删除景点
  const handleRemoveAttraction = useCallback((dayIndex: number, attractionIndex: number) => {
    setLocalItinerary((prev) => ({
      ...prev,
      days: prev.days.map((day, idx) => {
        if (idx === dayIndex) {
          return {
            ...day,
            attractions: day.attractions.filter((_, i) => i !== attractionIndex),
          }
        }
        return day
      }),
    }))

    setModifications((prev) => [
      ...prev,
      {
        type: 'remove',
        dayIndex,
        attractionIndex,
      },
    ])
  }, [])

  // 调整顺序
  const handleReorderAttraction = useCallback(
    (dayIndex: number, fromIndex: number, toIndex: number) => {
      if (toIndex < 0) return

      setLocalItinerary((prev) => ({
        ...prev,
        days: prev.days.map((day, idx) => {
          if (idx === dayIndex) {
            const attractions = [...day.attractions]
            if (toIndex >= attractions.length) return day

            const [moved] = attractions.splice(fromIndex, 1)
            attractions.splice(toIndex, 0, moved)
            return { ...day, attractions }
          }
          return day
        }),
      }))

      setModifications((prev) => [
        ...prev,
        {
          type: 'reorder',
          dayIndex,
          fromIndex,
          toIndex,
        },
      ])
    },
    []
  )

  // 重置修改
  const handleReset = useCallback(() => {
    setLocalItinerary(draftItinerary)
    setModifications([])
  }, [draftItinerary])

  // 确认行程
  const handleApprove = useCallback(() => {
    const decision: ItineraryReviewDecision = {
      type: hasModifications ? 'modify' : 'approve',
      modifications: hasModifications ? modifications : undefined,
    }
    onDecision(decision)
  }, [hasModifications, modifications, onDecision])

  // 重新规划
  const handleRetry = useCallback(() => {
    const decision: ItineraryReviewDecision = {
      type: 'retry',
    }
    onDecision(decision)
  }, [onDecision])

  return (
    <div className="space-y-6">
      {/* 天气警告 */}
      {weatherWarnings && weatherWarnings.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                天气提醒
              </h4>
              <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {weatherWarnings.map((warning, idx) => (
                  <li key={idx}>· {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 统计摘要 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalDays}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">天</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalAttractions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">景点</div>
          </div>
        </div>

        {hasModifications && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-500"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            重置修改
          </Button>
        )}
      </div>

      {/* 行程列表 */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {localItinerary.days.map((day, dayIndex) => (
          <DayCard
            key={dayIndex}
            day={day}
            dayIndex={dayIndex}
            isExpanded={expandedDays.has(dayIndex)}
            onToggle={() => toggleDay(dayIndex)}
            onRemoveAttraction={(idx) => handleRemoveAttraction(dayIndex, idx)}
            onReorderAttraction={(from, to) =>
              handleReorderAttraction(dayIndex, from, to)
            }
          />
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消规划
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={isSubmitting}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重新规划
          </Button>

          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                处理中...
              </span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {hasModifications ? '确认修改' : '确认行程'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ItineraryReviewPanel
