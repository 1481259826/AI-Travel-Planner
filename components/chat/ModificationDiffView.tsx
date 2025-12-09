'use client'

/**
 * 行程修改对比视图组件
 * 以左右对比布局显示修改前后的行程差异
 * 支持变更项高亮、时间线对比、成本对比
 */

import { useState } from 'react'
import type { ModificationPreview, DayPlanSummary, ModificationChange } from '@/lib/chat/types'

// ============================================================================
// 类型定义
// ============================================================================

interface ModificationDiffViewProps {
  /** 修改预览数据 */
  preview: ModificationPreview
  /** 是否启用编辑模式（微调功能） */
  editable?: boolean
  /** 时间修改回调 */
  onTimeChange?: (dayIndex: number, activityIndex: number, newTime: string) => void
}

interface TimeEditorProps {
  time: string
  dayIndex: number
  activityIndex: number
  onChange: (dayIndex: number, activityIndex: number, newTime: string) => void
}

// ============================================================================
// 变更类型样式
// ============================================================================

const CHANGE_STYLES = {
  added: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-4 border-green-500',
    text: 'text-green-700 dark:text-green-300',
    badge: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200',
    icon: '➕',
    label: '新增',
  },
  removed: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-4 border-red-500',
    text: 'text-red-700 dark:text-red-300 line-through',
    badge: 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200',
    icon: '❌',
    label: '删除',
  },
  modified: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-4 border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200',
    icon: '📝',
    label: '修改',
  },
  normal: {
    bg: '',
    border: 'border-l-4 border-transparent',
    text: 'text-gray-700 dark:text-gray-300',
    badge: '',
    icon: '',
    label: '',
  },
}

// ============================================================================
// 时间编辑器组件
// ============================================================================

function TimeEditor({ time, dayIndex, activityIndex, onChange }: TimeEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(time)

  const handleSave = () => {
    // 验证时间格式
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (timeRegex.test(editValue)) {
      onChange(dayIndex, activityIndex, editValue)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-20 px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setEditValue(time)
              setIsEditing(false)
            }
          }}
          autoFocus
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
      title="点击修改时间"
    >
      {time}
    </button>
  )
}

// ============================================================================
// 单天对比组件
// ============================================================================

interface DayComparisonProps {
  dayBefore: DayPlanSummary
  dayAfter: DayPlanSummary
  changes: ModificationChange[]
  editable?: boolean
  onTimeChange?: (dayIndex: number, activityIndex: number, newTime: string) => void
}

function DayComparison({
  dayBefore,
  dayAfter,
  changes,
  editable,
  onTimeChange,
}: DayComparisonProps) {
  const dayIndex = dayBefore.day - 1

  // 检查是否有当天的变更
  const hasChanges = changes.some((c) => c.dayIndex === dayIndex)
  if (!hasChanges) return null

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-3">
      {/* 天标题 */}
      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h5 className="font-medium text-sm text-gray-900 dark:text-white">
          第 {dayBefore.day} 天
          {dayBefore.date && (
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
              {dayBefore.date}
            </span>
          )}
        </h5>
      </div>

      {/* 左右对比 */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* 修改前 */}
        <div className="p-3">
          <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            修改前
          </h6>
          <div className="space-y-1.5">
            {dayBefore.activities.map((activity, idx) => {
              const style = activity.changeType
                ? CHANGE_STYLES[activity.changeType]
                : CHANGE_STYLES.normal
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${style.bg} ${style.border}`}
                >
                  <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">
                    {activity.time}
                  </span>
                  <span className={`flex-1 ${style.text}`}>{activity.name}</span>
                  {activity.changeType && (
                    <span className={`px-1.5 py-0.5 text-xs rounded ${style.badge}`}>
                      {CHANGE_STYLES[activity.changeType].label}
                    </span>
                  )}
                </div>
              )
            })}
            {dayBefore.activities.length === 0 && (
              <p className="text-xs text-gray-400 italic">暂无活动</p>
            )}
          </div>
        </div>

        {/* 修改后 */}
        <div className="p-3">
          <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            修改后
          </h6>
          <div className="space-y-1.5">
            {dayAfter.activities.map((activity, idx) => {
              const style = activity.changeType
                ? CHANGE_STYLES[activity.changeType]
                : CHANGE_STYLES.normal
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${style.bg} ${style.border}`}
                >
                  {editable && onTimeChange && activity.changeType !== 'removed' ? (
                    <TimeEditor
                      time={activity.time}
                      dayIndex={dayIndex}
                      activityIndex={idx}
                      onChange={onTimeChange}
                    />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">
                      {activity.time}
                    </span>
                  )}
                  <span className={`flex-1 ${style.text}`}>{activity.name}</span>
                  {activity.changeType && (
                    <span className={`px-1.5 py-0.5 text-xs rounded ${style.badge}`}>
                      {CHANGE_STYLES[activity.changeType].label}
                    </span>
                  )}
                </div>
              )
            })}
            {dayAfter.activities.length === 0 && (
              <p className="text-xs text-gray-400 italic">暂无活动</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 成本对比组件
// ============================================================================

interface CostComparisonProps {
  beforeCost: number
  afterCost: number
  costDelta: number
}

function CostComparison({ beforeCost, afterCost, costDelta }: CostComparisonProps) {
  const deltaColor =
    costDelta > 0
      ? 'text-red-600 dark:text-red-400'
      : costDelta < 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-600 dark:text-gray-400'

  const deltaText =
    costDelta > 0 ? `+¥${costDelta}` : costDelta < 0 ? `-¥${Math.abs(costDelta)}` : '无变化'

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        预算对比
      </h5>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs">修改前</p>
          <p className="font-medium text-gray-900 dark:text-white">¥{beforeCost}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs">变化</p>
          <p className={`font-medium ${deltaColor}`}>{deltaText}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs">修改后</p>
          <p className="font-medium text-gray-900 dark:text-white">¥{afterCost}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ModificationDiffView({
  preview,
  editable = false,
  onTimeChange,
}: ModificationDiffViewProps) {
  const { before, after, changes, impact } = preview

  // 只显示受影响的天数
  const affectedDayIndices = impact.affectedDays

  return (
    <div className="space-y-4">
      {/* 对比说明 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-green-500"></span> 新增
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500"></span> 删除
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-blue-500"></span> 修改
        </span>
        {editable && (
          <span className="ml-auto text-blue-600 dark:text-blue-400">
            点击时间可编辑
          </span>
        )}
      </div>

      {/* 按天对比 */}
      <div className="space-y-3">
        {affectedDayIndices.map((dayIndex) => {
          const dayBefore = before.days[dayIndex]
          const dayAfter = after.days[dayIndex]
          if (!dayBefore && !dayAfter) return null

          return (
            <DayComparison
              key={dayIndex}
              dayBefore={dayBefore || { day: dayIndex + 1, date: '', activities: [] }}
              dayAfter={dayAfter || { day: dayIndex + 1, date: '', activities: [] }}
              changes={changes}
              editable={editable}
              onTimeChange={onTimeChange}
            />
          )
        })}
      </div>

      {/* 成本对比 */}
      <CostComparison
        beforeCost={before.totalCost}
        afterCost={after.totalCost}
        costDelta={impact.costDelta}
      />
    </div>
  )
}

export default ModificationDiffView
