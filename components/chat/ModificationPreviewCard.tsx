'use client'

/**
 * 行程修改预览卡片组件
 * 显示修改预览、变更摘要和影响评估，支持确认/取消操作
 * Phase 2: 增强版 - 集成对比视图、影响评估和微调功能
 */

import { useState, useCallback } from 'react'
import type { ModificationPreview } from '@/lib/chat/types'
import { getOperationLabel, getOperationIcon } from '@/lib/stores/modification-store'
import { ModificationDiffView } from './ModificationDiffView'
import { ModificationImpactSummary } from './ModificationImpactSummary'

// ============================================================================
// 类型定义
// ============================================================================

interface ModificationPreviewCardProps {
  /** 修改预览数据 */
  preview: ModificationPreview
  /** 确认回调 */
  onConfirm: (modificationId: string, userAdjustments?: UserAdjustments) => void
  /** 取消回调 */
  onCancel: (modificationId: string) => void
  /** 是否正在处理 */
  isProcessing?: boolean
  /** 是否禁用操作 */
  disabled?: boolean
}

/** 用户微调数据 */
interface UserAdjustments {
  time_adjustments?: Array<{
    day_index: number
    activity_index: number
    new_time: string
  }>
}

// ============================================================================
// 变更类型图标映射
// ============================================================================

const CHANGE_TYPE_ICONS: Record<string, string> = {
  add: '➕',
  remove: '❌',
  modify: '📝',
  reorder: '🔄',
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  add: 'text-green-600 dark:text-green-400',
  remove: 'text-red-600 dark:text-red-400',
  modify: 'text-blue-600 dark:text-blue-400',
  reorder: 'text-purple-600 dark:text-purple-400',
}

// ============================================================================
// 视图模式
// ============================================================================

type ViewMode = 'summary' | 'diff' | 'impact'

// ============================================================================
// 组件实现
// ============================================================================

export function ModificationPreviewCard({
  preview,
  onConfirm,
  onCancel,
  isProcessing = false,
  disabled = false,
}: ModificationPreviewCardProps) {
  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('summary')

  // 用户微调数据
  const [userAdjustments, setUserAdjustments] = useState<UserAdjustments>({
    time_adjustments: [],
  })

  // 是否有未保存的微调
  const hasAdjustments = (userAdjustments.time_adjustments?.length || 0) > 0

  // 格式化成本变化
  const formatCostDelta = (delta: number) => {
    if (delta === 0) return '无变化'
    const sign = delta > 0 ? '+' : ''
    return `${sign}¥${delta}`
  }

  // 格式化剩余时间
  const formatRemainingTime = () => {
    const remaining = preview.expiresAt - Date.now()
    if (remaining <= 0) return '已过期'
    const minutes = Math.ceil(remaining / 60000)
    return `${minutes} 分钟后过期`
  }

  // 检查是否已过期
  const isExpired = preview.status === 'expired' || Date.now() > preview.expiresAt

  // 处理时间微调
  const handleTimeChange = useCallback(
    (dayIndex: number, activityIndex: number, newTime: string) => {
      setUserAdjustments((prev) => {
        const timeAdjustments = [...(prev.time_adjustments || [])]

        // 查找是否已有该活动的调整
        const existingIndex = timeAdjustments.findIndex(
          (adj) => adj.day_index === dayIndex && adj.activity_index === activityIndex
        )

        if (existingIndex >= 0) {
          // 更新现有调整
          timeAdjustments[existingIndex] = {
            day_index: dayIndex,
            activity_index: activityIndex,
            new_time: newTime,
          }
        } else {
          // 添加新调整
          timeAdjustments.push({
            day_index: dayIndex,
            activity_index: activityIndex,
            new_time: newTime,
          })
        }

        return { ...prev, time_adjustments: timeAdjustments }
      })
    },
    []
  )

  // 处理确认
  const handleConfirm = () => {
    onConfirm(preview.id, hasAdjustments ? userAdjustments : undefined)
  }

  // 重置微调
  const resetAdjustments = () => {
    setUserAdjustments({ time_adjustments: [] })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* 头部 */}
      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getOperationIcon(preview.operation)}</span>
            <h3 className="font-medium text-gray-900 dark:text-white">
              行程修改预览
            </h3>
            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded">
              {getOperationLabel(preview.operation)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasAdjustments && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 rounded">
                有微调
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatRemainingTime()}
            </span>
          </div>
        </div>
      </div>

      {/* 视图切换标签 */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
          <button
            onClick={() => setViewMode('summary')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'summary'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            摘要
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'diff'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            对比详情
          </button>
          <button
            onClick={() => setViewMode('impact')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'impact'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            影响评估
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 摘要视图 */}
        {viewMode === 'summary' && (
          <div className="space-y-4">
            {/* 变更摘要 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <span>📍</span> 变更摘要
              </h4>
              <ul className="space-y-1.5">
                {preview.changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className={CHANGE_TYPE_COLORS[change.type]}>
                      {CHANGE_TYPE_ICONS[change.type]}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {change.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 简要影响信息 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-400">受影响天数：</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  第 {preview.impact.affectedDays.map((d) => d + 1).join('、')} 天
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-400">预算变化：</span>
                <span
                  className={`font-medium ${
                    preview.impact.costDelta > 0
                      ? 'text-red-600 dark:text-red-400'
                      : preview.impact.costDelta < 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {formatCostDelta(preview.impact.costDelta)}
                </span>
              </div>
            </div>

            {/* 警告信息 */}
            {preview.impact.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.impact.warnings.map((warning, idx) => (
                  <p
                    key={idx}
                    className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-1"
                  >
                    <span>⚠️</span>
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 对比详情视图 */}
        {viewMode === 'diff' && (
          <ModificationDiffView
            preview={preview}
            editable={!isExpired && !disabled && !isProcessing}
            onTimeChange={handleTimeChange}
          />
        )}

        {/* 影响评估视图 */}
        {viewMode === 'impact' && (
          <ModificationImpactSummary preview={preview} detailed />
        )}
      </div>

      {/* 微调提示（如果有微调） */}
      {hasAdjustments && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              已进行 {userAdjustments.time_adjustments?.length || 0} 项时间微调
            </p>
            <button
              onClick={resetAdjustments}
              className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
            >
              重置
            </button>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {preview.changes.length} 项变更
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCancel(preview.id)}
            disabled={disabled || isProcessing || isExpired}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={disabled || isProcessing || isExpired}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>处理中...</span>
              </>
            ) : isExpired ? (
              '已过期'
            ) : hasAdjustments ? (
              '确认修改（含微调）'
            ) : (
              '确认修改'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModificationPreviewCard
