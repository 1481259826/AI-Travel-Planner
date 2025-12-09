'use client'

/**
 * 行程修改影响评估组件
 * 显示修改的影响评估：成本变化、时间影响、警告信息和受影响天数
 */

import type { ModificationPreview } from '@/lib/chat/types'

// ============================================================================
// 类型定义
// ============================================================================

interface ModificationImpactSummaryProps {
  /** 修改预览数据 */
  preview: ModificationPreview
  /** 是否显示详细信息 */
  detailed?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// 影响指标卡片组件
// ============================================================================

interface ImpactMetricCardProps {
  icon: string
  label: string
  value: string | number
  subValue?: string
  type?: 'neutral' | 'positive' | 'negative' | 'warning'
}

function ImpactMetricCard({
  icon,
  label,
  value,
  subValue,
  type = 'neutral',
}: ImpactMetricCardProps) {
  const typeStyles = {
    neutral: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    positive: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    negative: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  }

  const valueStyles = {
    neutral: 'text-gray-900 dark:text-white',
    positive: 'text-green-700 dark:text-green-300',
    negative: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
  }

  return (
    <div
      className={`rounded-lg border p-3 ${typeStyles[type]} transition-colors`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-lg font-semibold ${valueStyles[type]}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subValue}</p>
      )}
    </div>
  )
}

// ============================================================================
// 警告列表组件
// ============================================================================

interface WarningListProps {
  warnings: string[]
}

function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
        >
          <span className="text-yellow-500 flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 受影响天数标记组件
// ============================================================================

interface AffectedDaysBadgesProps {
  affectedDays: number[]
  totalDays: number
}

function AffectedDaysBadges({ affectedDays, totalDays }: AffectedDaysBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Array.from({ length: totalDays }, (_, i) => {
        const isAffected = affectedDays.includes(i)
        return (
          <span
            key={i}
            className={`inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-full transition-colors ${
              isAffected
                ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 ring-2 ring-blue-500'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={isAffected ? `第 ${i + 1} 天有变更` : `第 ${i + 1} 天无变更`}
          >
            {i + 1}
          </span>
        )
      })}
    </div>
  )
}

// ============================================================================
// 变更统计组件
// ============================================================================

interface ChangeStatsProps {
  changes: ModificationPreview['changes']
}

function ChangeStats({ changes }: ChangeStatsProps) {
  const stats = {
    add: changes.filter((c) => c.type === 'add').length,
    remove: changes.filter((c) => c.type === 'remove').length,
    modify: changes.filter((c) => c.type === 'modify').length,
    reorder: changes.filter((c) => c.type === 'reorder').length,
  }

  const hasChanges = Object.values(stats).some((v) => v > 0)
  if (!hasChanges) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {stats.add > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200">
          <span>➕</span> {stats.add} 个新增
        </span>
      )}
      {stats.remove > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200">
          <span>❌</span> {stats.remove} 个删除
        </span>
      )}
      {stats.modify > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
          <span>📝</span> {stats.modify} 个修改
        </span>
      )}
      {stats.reorder > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200">
          <span>🔄</span> {stats.reorder} 个调整
        </span>
      )}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ModificationImpactSummary({
  preview,
  detailed = false,
  className = '',
}: ModificationImpactSummaryProps) {
  const { impact, changes, before, after } = preview

  // 格式化成本变化
  const formatCostDelta = (delta: number) => {
    if (delta === 0) return '无变化'
    const sign = delta > 0 ? '+' : ''
    return `${sign}¥${delta}`
  }

  // 确定成本变化类型
  const costType =
    impact.costDelta > 0 ? 'negative' : impact.costDelta < 0 ? 'positive' : 'neutral'

  // 确定警告类型
  const warningType = impact.warnings.length > 0 ? 'warning' : 'neutral'

  // 计算总天数
  const totalDays = Math.max(before.days.length, after.days.length)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 核心指标网格 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 受影响天数 */}
        <ImpactMetricCard
          icon="📅"
          label="受影响天数"
          value={`${impact.affectedDays.length} 天`}
          subValue={`共 ${totalDays} 天行程`}
          type="neutral"
        />

        {/* 预算变化 */}
        <ImpactMetricCard
          icon="💰"
          label="预算变化"
          value={formatCostDelta(impact.costDelta)}
          subValue={`¥${before.totalCost} → ¥${after.totalCost}`}
          type={costType}
        />
      </div>

      {/* 时间影响描述 */}
      {impact.timeImpact && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
          <span>⏱️</span>
          <span>{impact.timeImpact}</span>
        </div>
      )}

      {/* 变更统计（详细模式） */}
      {detailed && <ChangeStats changes={changes} />}

      {/* 受影响天数标记（详细模式） */}
      {detailed && totalDays > 1 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">受影响天数：</p>
          <AffectedDaysBadges affectedDays={impact.affectedDays} totalDays={totalDays} />
        </div>
      )}

      {/* 警告信息 */}
      <WarningList warnings={impact.warnings} />
    </div>
  )
}

export default ModificationImpactSummary
