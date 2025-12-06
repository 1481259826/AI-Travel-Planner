/**
 * Human-in-the-Loop 状态扩展
 * 扩展基础 TripState，添加 HITL 交互所需的状态字段
 */

import { Annotation } from '@langchain/langgraph'
import { TripStateAnnotation, TripState } from './state'
import type { DraftItinerary, BudgetResult, AttractionSlot } from './state'

// ============================================================================
// HITL 中断类型
// ============================================================================

/**
 * 中断类型枚举
 */
export type HITLInterruptType =
  | 'itinerary_review' // 行程骨架审核
  | 'budget_decision' // 预算超支决策
  | 'final_confirm' // 最终确认

/**
 * 用户决策类型
 */
export type UserDecisionType = 'approve' | 'modify' | 'cancel' | 'retry'

// ============================================================================
// 行程审核相关类型
// ============================================================================

/**
 * 景点修改操作
 */
export interface AttractionModification {
  type: 'add' | 'remove' | 'reorder' | 'update'
  dayIndex?: number // 添加/移除的日期索引
  attractionIndex?: number // 景点在当天的索引
  attraction?: AttractionSlot // 添加或更新的景点信息
  fromIndex?: number // 重排序：原位置
  toIndex?: number // 重排序：目标位置
}

/**
 * 行程审核用户决策
 */
export interface ItineraryReviewDecision {
  type: UserDecisionType
  modifications?: AttractionModification[]
  comment?: string // 用户备注
}

/**
 * 行程审核选项
 */
export interface ItineraryReviewOptions {
  draftItinerary: DraftItinerary
  suggestedAlternatives?: AttractionSlot[] // 可替换的景点建议
  weatherWarnings?: string[] // 天气相关警告
}

// ============================================================================
// 预算决策相关类型
// ============================================================================

/**
 * 预算调整方案
 */
export interface BudgetAdjustmentOption {
  id: string
  label: string
  description: string
  savingsAmount: number // 可节省金额
  impact: 'low' | 'medium' | 'high' // 对体验的影响程度
  details?: {
    // 具体调整内容
    hotelDowngrade?: {
      from: string
      to: string
      priceDiff: number
    }
    attractionsToRemove?: string[]
    transportChange?: string
    mealAdjustment?: string
  }
}

/**
 * 预算决策用户选择
 */
export interface BudgetDecision {
  type: UserDecisionType
  selectedOptionId?: string // 选择的调整方案 ID
  acceptOverage?: boolean // 接受超支
  customBudget?: number // 自定义新预算
}

/**
 * 预算决策选项
 */
export interface BudgetDecisionOptions {
  budgetResult: BudgetResult
  adjustmentOptions: BudgetAdjustmentOption[]
  overageAmount: number // 超支金额
  overagePercentage: number // 超支百分比
}

// ============================================================================
// 最终确认相关类型
// ============================================================================

/**
 * 最终确认决策
 */
export interface FinalConfirmDecision {
  type: 'confirm' | 'restart' | 'cancel'
  feedback?: string
}

/**
 * 最终确认选项
 */
export interface FinalConfirmOptions {
  summary: {
    destination: string
    dates: string
    totalDays: number
    totalAttractions: number
    totalCost: number
    budgetUtilization: number
  }
}

// ============================================================================
// HITL 统一状态
// ============================================================================

/**
 * HITL 中断数据（用于前端展示）
 */
export interface HITLInterruptData {
  interruptType: HITLInterruptType
  message: string
  timestamp: number
  threadId: string
  options:
    | ItineraryReviewOptions
    | BudgetDecisionOptions
    | FinalConfirmOptions
}

/**
 * HITL 用户决策（统一类型）
 */
export type HITLUserDecision =
  | ItineraryReviewDecision
  | BudgetDecision
  | FinalConfirmDecision

/**
 * HITL 状态字段
 */
export interface HITLStateFields {
  awaitingInput: boolean // 是否等待用户输入
  interruptType: HITLInterruptType | null // 当前中断类型
  interruptMessage: string | null // 中断提示消息
  interruptedAt: number | null // 中断时间戳
  options: ItineraryReviewOptions | BudgetDecisionOptions | FinalConfirmOptions | null
  userDecision: HITLUserDecision | null // 用户决策
  resumedAt: number | null // 恢复执行时间戳
  interruptHistory: Array<{
    type: HITLInterruptType
    timestamp: number
    decision: HITLUserDecision
  }>
}

// ============================================================================
// HITL 状态 Annotation
// ============================================================================

/**
 * HITLTripStateAnnotation
 * 扩展基础 TripState，添加 HITL 相关字段
 */
export const HITLTripStateAnnotation = Annotation.Root({
  // 继承基础状态的所有字段
  ...TripStateAnnotation.spec,

  // Human-in-the-Loop 状态
  hitl: Annotation<HITLStateFields>({
    default: () => ({
      awaitingInput: false,
      interruptType: null,
      interruptMessage: null,
      interruptedAt: null,
      options: null,
      userDecision: null,
      resumedAt: null,
      interruptHistory: [],
    }),
    reducer: (current, newVal) => {
      // 如果是恢复操作，记录历史
      if (current.interruptType && newVal.userDecision && !newVal.awaitingInput) {
        return {
          ...newVal,
          interruptHistory: [
            ...current.interruptHistory,
            {
              type: current.interruptType,
              timestamp: current.interruptedAt || Date.now(),
              decision: newVal.userDecision,
            },
          ],
        }
      }
      return newVal
    },
  }),

  // 线程 ID（用于恢复工作流）
  threadId: Annotation<string | null>({
    default: () => null,
    reducer: (_, newVal) => newVal,
  }),
})

/**
 * HITLTripState 类型
 */
export type HITLTripState = typeof HITLTripStateAnnotation.State

/**
 * HITLTripState 更新类型
 */
export type HITLTripStateUpdate = typeof HITLTripStateAnnotation.Update

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建中断状态更新
 */
export function createInterruptUpdate(
  interruptType: HITLInterruptType,
  message: string,
  options: ItineraryReviewOptions | BudgetDecisionOptions | FinalConfirmOptions
): Partial<HITLStateFields> {
  return {
    awaitingInput: true,
    interruptType,
    interruptMessage: message,
    interruptedAt: Date.now(),
    options,
    userDecision: null,
    resumedAt: null,
  }
}

/**
 * 创建恢复状态更新
 */
export function createResumeUpdate(
  decision: HITLUserDecision
): Partial<HITLStateFields> {
  return {
    awaitingInput: false,
    interruptType: null,
    interruptMessage: null,
    options: null,
    userDecision: decision,
    resumedAt: Date.now(),
  }
}

/**
 * 检查是否是有效的用户决策
 */
export function isValidDecision(
  decision: unknown,
  interruptType: HITLInterruptType
): decision is HITLUserDecision {
  if (!decision || typeof decision !== 'object') {
    return false
  }

  const d = decision as Record<string, unknown>

  // 检查通用的 type 字段
  if (!d.type || typeof d.type !== 'string') {
    return false
  }

  switch (interruptType) {
    case 'itinerary_review':
      return ['approve', 'modify', 'cancel', 'retry'].includes(d.type as string)

    case 'budget_decision':
      return ['approve', 'modify', 'cancel', 'retry'].includes(d.type as string)

    case 'final_confirm':
      return ['confirm', 'restart', 'cancel'].includes(d.type as string)

    default:
      return false
  }
}

/**
 * 从基础 TripState 创建 HITLTripState
 */
export function toHITLState(
  baseState: TripState,
  threadId?: string
): HITLTripState {
  return {
    ...baseState,
    hitl: {
      awaitingInput: false,
      interruptType: null,
      interruptMessage: null,
      interruptedAt: null,
      options: null,
      userDecision: null,
      resumedAt: null,
      interruptHistory: [],
    },
    threadId: threadId || null,
  }
}
