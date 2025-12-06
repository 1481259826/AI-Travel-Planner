/**
 * BudgetDecisionPanel - 预算决策面板
 * 当预算超支时，允许用户选择调整方案
 */

'use client'

import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  TrendingDown,
  Hotel,
  MapPin,
  Bus,
  UtensilsCrossed,
  Check,
  DollarSign,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  BudgetDecisionOptions,
  BudgetDecision,
  BudgetAdjustmentOption,
} from '@/lib/agents/state-hitl'

// ============================================================================
// 类型定义
// ============================================================================

interface BudgetDecisionPanelProps {
  /** 预算决策选项 */
  options: BudgetDecisionOptions
  /** 是否正在提交 */
  isSubmitting?: boolean
  /** 提交决策回调 */
  onDecision: (decision: BudgetDecision) => void
  /** 取消回调 */
  onCancel: () => void
}

interface AdjustmentOptionCardProps {
  option: BudgetAdjustmentOption
  isSelected: boolean
  onSelect: () => void
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取调整方案的图标
 */
function getOptionIcon(optionId: string) {
  switch (optionId) {
    case 'downgrade_hotel':
      return <Hotel className="w-5 h-5" />
    case 'reduce_attractions':
      return <MapPin className="w-5 h-5" />
    case 'cheaper_transport':
      return <Bus className="w-5 h-5" />
    case 'adjust_meals':
      return <UtensilsCrossed className="w-5 h-5" />
    default:
      return <TrendingDown className="w-5 h-5" />
  }
}

/**
 * 获取影响程度的颜色
 */
function getImpactColor(impact: 'low' | 'medium' | 'high') {
  switch (impact) {
    case 'low':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'high':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
  }
}

/**
 * 获取影响程度的标签
 */
function getImpactLabel(impact: 'low' | 'medium' | 'high') {
  switch (impact) {
    case 'low':
      return '影响小'
    case 'medium':
      return '影响中等'
    case 'high':
      return '影响较大'
    default:
      return '未知'
  }
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * 调整方案卡片
 */
function AdjustmentOptionCard({
  option,
  isSelected,
  onSelect,
}: AdjustmentOptionCardProps) {
  return (
    <button
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          {getOptionIcon(option.id)}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {option.label}
            </h4>
            <span className="text-green-600 dark:text-green-400 font-medium">
              -¥{option.savingsAmount.toFixed(0)}
            </span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {option.description}
          </p>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor(
                option.impact
              )}`}
            >
              {getImpactLabel(option.impact)}
            </span>
          </div>

          {/* 详细信息 */}
          {option.details && (
            <div className="mt-2 pt-2 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
              {option.details.hotelDowngrade && (
                <p>
                  酒店: {option.details.hotelDowngrade.from} →{' '}
                  {option.details.hotelDowngrade.to}
                </p>
              )}
              {option.details.transportChange && (
                <p>交通: {option.details.transportChange}</p>
              )}
              {option.details.mealAdjustment && (
                <p>餐饮: {option.details.mealAdjustment}</p>
              )}
            </div>
          )}
        </div>

        {/* 选中标记 */}
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function BudgetDecisionPanel({
  options,
  isSubmitting = false,
  onDecision,
  onCancel,
}: BudgetDecisionPanelProps) {
  const { budgetResult, adjustmentOptions, overageAmount, overagePercentage } = options

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  // 确认调整方案
  const handleConfirmAdjustment = useCallback(() => {
    if (!selectedOptionId) return

    const decision: BudgetDecision = {
      type: 'modify',
      selectedOptionId,
    }
    onDecision(decision)
  }, [selectedOptionId, onDecision])

  // 接受超支
  const handleAcceptOverage = useCallback(() => {
    const decision: BudgetDecision = {
      type: 'approve',
      acceptOverage: true,
    }
    onDecision(decision)
  }, [onDecision])

  // 取消
  const handleCancel = useCallback(() => {
    const decision: BudgetDecision = {
      type: 'cancel',
    }
    onDecision(decision)
  }, [onDecision])

  return (
    <div className="space-y-6">
      {/* 预算超支提示 */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              预算超支提醒
            </h3>
            <p className="mt-1 text-yellow-700 dark:text-yellow-300">
              当前规划的总费用超出您的预算，请选择调整方案或接受超支。
            </p>
          </div>
        </div>
      </div>

      {/* 费用统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">预算</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            ¥{budgetResult.budget.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm">预计花费</span>
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            ¥{budgetResult.totalCost.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-red-500 dark:text-red-400 mb-1">
            <Percent className="w-4 h-4" />
            <span className="text-sm">超支</span>
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            ¥{overageAmount.toFixed(0)}
            <span className="text-sm font-normal ml-1">
              ({(overagePercentage * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 费用明细 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          费用明细
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {budgetResult.costBreakdown.accommodation > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Hotel className="w-4 h-4" /> 住宿
              </span>
              <span className="text-gray-900 dark:text-white">
                ¥{budgetResult.costBreakdown.accommodation.toLocaleString()}
              </span>
            </div>
          )}
          {budgetResult.costBreakdown.transport > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Bus className="w-4 h-4" /> 交通
              </span>
              <span className="text-gray-900 dark:text-white">
                ¥{budgetResult.costBreakdown.transport.toLocaleString()}
              </span>
            </div>
          )}
          {budgetResult.costBreakdown.attractions > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> 景点
              </span>
              <span className="text-gray-900 dark:text-white">
                ¥{budgetResult.costBreakdown.attractions.toLocaleString()}
              </span>
            </div>
          )}
          {budgetResult.costBreakdown.dining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" /> 餐饮
              </span>
              <span className="text-gray-900 dark:text-white">
                ¥{budgetResult.costBreakdown.dining.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 调整方案 */}
      {adjustmentOptions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            选择调整方案（可节省费用）
          </h4>
          <div className="space-y-3">
            {adjustmentOptions.map((option) => (
              <AdjustmentOptionCard
                key={option.id}
                option={option}
                isSelected={selectedOptionId === option.id}
                onSelect={() =>
                  setSelectedOptionId(
                    selectedOptionId === option.id ? null : option.id
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          取消规划
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleAcceptOverage}
            disabled={isSubmitting}
          >
            接受超支
          </Button>

          <Button
            onClick={handleConfirmAdjustment}
            disabled={isSubmitting || !selectedOptionId}
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
                应用调整
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BudgetDecisionPanel
