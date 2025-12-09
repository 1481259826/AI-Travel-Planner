'use client'

/**
 * 行程修改预览卡片组件
 * 显示修改预览、变更摘要和影响评估，支持确认/取消操作
 */

import { useState } from 'react'
import type { ModificationPreview } from '@/lib/chat/types'
import { getOperationLabel, getOperationIcon } from '@/lib/stores/modification-store'

// ============================================================================
// 类型定义
// ============================================================================

interface ModificationPreviewCardProps {
  /** 修改预览数据 */
  preview: ModificationPreview
  /** 确认回调 */
  onConfirm: (modificationId: string) => void
  /** 取消回调 */
  onCancel: (modificationId: string) => void
  /** 是否正在处理 */
  isProcessing?: boolean
  /** 是否禁用操作 */
  disabled?: boolean
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
// 组件实现
// ============================================================================

export function ModificationPreviewCard({
  preview,
  onConfirm,
  onCancel,
  isProcessing = false,
  disabled = false,
}: ModificationPreviewCardProps) {
  const [showDetails, setShowDetails] = useState(false)

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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRemainingTime()}
          </span>
        </div>
      </div>

      {/* 变更摘要 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
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

      {/* 影响评估 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
          <span>📊</span> 影响评估
        </h4>
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
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">时间影响：</span>
            <span className="text-gray-900 dark:text-white">
              {preview.impact.timeImpact}
            </span>
          </div>
        </div>

        {/* 警告信息 */}
        {preview.impact.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
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

      {/* 详情对比（可展开） */}
      {showDetails && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
            <span>📋</span> 修改前后对比
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* 修改前 */}
            <div>
              <h5 className="font-medium text-gray-600 dark:text-gray-400 mb-2">
                修改前
              </h5>
              {preview.before.days
                .filter((day) =>
                  preview.impact.affectedDays.includes(day.day - 1)
                )
                .map((day) => (
                  <div key={day.day} className="mb-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      第 {day.day} 天 - {day.date}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {day.activities.map((act, idx) => (
                        <li
                          key={idx}
                          className={`flex items-center gap-1 ${
                            act.changeType === 'removed'
                              ? 'text-red-500 line-through'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span>{act.time}</span>
                          <span>{act.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              <p className="mt-2 text-gray-500">
                预算: ¥{preview.before.totalCost}
              </p>
            </div>

            {/* 修改后 */}
            <div>
              <h5 className="font-medium text-gray-600 dark:text-gray-400 mb-2">
                修改后
              </h5>
              {preview.after.days
                .filter((day) =>
                  preview.impact.affectedDays.includes(day.day - 1)
                )
                .map((day) => (
                  <div key={day.day} className="mb-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      第 {day.day} 天 - {day.date}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {day.activities.map((act, idx) => (
                        <li
                          key={idx}
                          className={`flex items-center gap-1 ${
                            act.changeType === 'added'
                              ? 'text-green-600 dark:text-green-400 font-medium'
                              : act.changeType === 'modified'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span>{act.time}</span>
                          <span>{act.name}</span>
                          {act.changeType === 'added' && (
                            <span className="text-green-500">（新增）</span>
                          )}
                        </li>
                      ))}
                      {day.activities.length === 0 && (
                        <li className="text-gray-400 italic">（空）</li>
                      )}
                    </ul>
                  </div>
                ))}
              <p className="mt-2 text-gray-500">
                预算: ¥{preview.after.totalCost}
                {preview.impact.costDelta !== 0 && (
                  <span
                    className={
                      preview.impact.costDelta > 0
                        ? 'text-red-500'
                        : 'text-green-500'
                    }
                  >
                    {' '}
                    ({formatCostDelta(preview.impact.costDelta)})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          disabled={disabled || isProcessing}
        >
          {showDetails ? '收起详情' : '查看详情'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCancel(preview.id)}
            disabled={disabled || isProcessing || isExpired}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(preview.id)}
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
