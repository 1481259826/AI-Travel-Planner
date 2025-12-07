/**
 * InterruptModal - Human-in-the-Loop 中断模态框
 * 当工作流中断等待用户输入时显示此组件
 */

'use client'

import { useState, useCallback } from 'react'
import { X, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItineraryReviewPanel } from './ItineraryReviewPanel'
import { BudgetDecisionPanel } from './BudgetDecisionPanel'
import type {
  HITLInterruptType,
  ItineraryReviewOptions,
  ItineraryReviewDecision,
  BudgetDecisionOptions,
  BudgetDecision,
  FinalConfirmOptions,
  HITLUserDecision,
} from '@/lib/agents/state-hitl'

// ============================================================================
// 类型定义
// ============================================================================

export interface InterruptModalProps {
  /** 是否显示模态框 */
  isOpen: boolean
  /** 线程 ID */
  threadId: string
  /** 中断类型 */
  interruptType: HITLInterruptType
  /** 中断消息 */
  message: string
  /** 中断选项数据 */
  options: ItineraryReviewOptions | BudgetDecisionOptions | FinalConfirmOptions
  /** 是否正在提交 */
  isSubmitting?: boolean
  /** 用户提交决策的回调 */
  onDecision: (decision: HITLUserDecision) => Promise<void>
  /** 取消/关闭的回调 */
  onCancel: () => void
}

// ============================================================================
// 组件实现
// ============================================================================

export function InterruptModal({
  isOpen,
  threadId,
  interruptType,
  message,
  options,
  isSubmitting = false,
  onDecision,
  onCancel,
}: InterruptModalProps) {
  const [error, setError] = useState<string | null>(null)

  // 处理决策提交
  const handleDecision = useCallback(async (decision: HITLUserDecision) => {
    setError(null)
    try {
      await onDecision(decision)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    }
  }, [onDecision])

  // 处理取消
  const handleCancel = useCallback(() => {
    const cancelDecision: HITLUserDecision = { type: 'cancel' }
    handleDecision(cancelDecision)
  }, [handleDecision])

  if (!isOpen) return null

  // 获取标题和描述
  const getTitle = () => {
    switch (interruptType) {
      case 'itinerary_review':
        return '确认行程安排'
      case 'budget_decision':
        return '预算调整'
      case 'final_confirm':
        return '最终确认'
      default:
        return '请确认'
    }
  }

  const getIcon = () => {
    switch (interruptType) {
      case 'itinerary_review':
        return <CheckCircle className="w-6 h-6 text-blue-500" />
      case 'budget_decision':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      case 'final_confirm':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 模态框内容 */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {getTitle()}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 主体内容 - 根据中断类型渲染不同面板 */}
        <div className="flex-1 overflow-auto p-6">
          {interruptType === 'itinerary_review' && (
            <ItineraryReviewPanel
              options={options as ItineraryReviewOptions}
              isSubmitting={isSubmitting}
              onDecision={(decision) => handleDecision(decision)}
              onCancel={handleCancel}
            />
          )}

          {interruptType === 'budget_decision' && (
            <BudgetDecisionPanel
              options={options as BudgetDecisionOptions}
              isSubmitting={isSubmitting}
              onDecision={(decision) => handleDecision(decision)}
              onCancel={handleCancel}
            />
          )}

          {interruptType === 'final_confirm' && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                行程规划已完成，是否确认生成最终行程？
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button
                  onClick={() => handleDecision({ type: 'confirm' })}
                  disabled={isSubmitting}
                >
                  确认生成
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 线程 ID 显示（调试用） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
            <p className="text-xs text-gray-400 font-mono">
              Thread ID: {threadId}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterruptModal
