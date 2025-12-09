/**
 * 行程修改状态管理
 * 使用 Zustand 管理修改预览和确认流程的状态
 */

import { create } from 'zustand'
import type { ModificationPreview } from '@/lib/chat/types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 修改状态
 */
interface ModificationState {
  /** 当前待确认的修改预览 */
  pendingModification: ModificationPreview | null

  /** 是否正在处理 */
  isProcessing: boolean

  /** 是否显示详情对比视图 */
  showDetails: boolean

  /** 错误信息 */
  error: string | null

  /** 设置待确认修改 */
  setPendingModification: (preview: ModificationPreview | null) => void

  /** 设置处理状态 */
  setProcessing: (processing: boolean) => void

  /** 设置显示详情 */
  setShowDetails: (show: boolean) => void

  /** 设置错误信息 */
  setError: (error: string | null) => void

  /** 清除修改状态 */
  clearModification: () => void

  /** 重置所有状态 */
  reset: () => void
}

// ============================================================================
// 初始状态
// ============================================================================

const initialState = {
  pendingModification: null,
  isProcessing: false,
  showDetails: false,
  error: null,
}

// ============================================================================
// Store 创建
// ============================================================================

/**
 * 修改状态 Store
 */
export const useModificationStore = create<ModificationState>((set) => ({
  ...initialState,

  setPendingModification: (preview) =>
    set({
      pendingModification: preview,
      showDetails: false,
      error: null,
    }),

  setProcessing: (processing) => set({ isProcessing: processing }),

  setShowDetails: (show) => set({ showDetails: show }),

  setError: (error) => set({ error }),

  clearModification: () =>
    set({
      pendingModification: null,
      isProcessing: false,
      showDetails: false,
      error: null,
    }),

  reset: () => set(initialState),
}))

// ============================================================================
// 辅助 Hooks
// ============================================================================

/**
 * 获取是否有待确认的修改
 */
export function useHasPendingModification(): boolean {
  return useModificationStore((state) => state.pendingModification !== null)
}

/**
 * 获取待确认的修改 ID
 */
export function usePendingModificationId(): string | null {
  return useModificationStore((state) => state.pendingModification?.id ?? null)
}

/**
 * 获取修改操作类型
 */
export function usePendingModificationOperation(): string | null {
  return useModificationStore((state) => state.pendingModification?.operation ?? null)
}

// ============================================================================
// 操作标签映射
// ============================================================================

/**
 * 操作类型到中文标签的映射
 */
export const OPERATION_LABELS: Record<string, string> = {
  add_attraction: '添加景点',
  remove_attraction: '删除景点',
  reorder: '调整顺序',
  change_time: '修改时间',
  change_hotel: '更换酒店',
  change_restaurant: '更换餐厅',
  add_day: '增加一天',
  remove_day: '删除一天',
  split_day: '拆分天数',
  merge_days: '合并天数',
  optimize_route: '优化路线',
  replan_day: '重新规划',
  adjust_for_weather: '天气适应',
  regenerate_day: '重生成天数',
  regenerate_trip_segment: '重生成行程段',
}

/**
 * 操作类型到图标的映射
 */
export const OPERATION_ICONS: Record<string, string> = {
  add_attraction: '➕',
  remove_attraction: '❌',
  reorder: '🔄',
  change_time: '⏰',
  change_hotel: '🏨',
  change_restaurant: '🍽️',
  add_day: '📅',
  remove_day: '🗑️',
  split_day: '✂️',
  merge_days: '🔗',
  optimize_route: '🗺️',
  replan_day: '✨',
  adjust_for_weather: '🌤️',
  regenerate_day: '🔁',
  regenerate_trip_segment: '♻️',
}

/**
 * 获取操作标签
 */
export function getOperationLabel(operation: string): string {
  return OPERATION_LABELS[operation] || operation
}

/**
 * 获取操作图标
 */
export function getOperationIcon(operation: string): string {
  return OPERATION_ICONS[operation] || '✏️'
}

export default useModificationStore
