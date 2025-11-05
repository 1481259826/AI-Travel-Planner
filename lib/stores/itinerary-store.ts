import { create } from 'zustand'
import type { Trip, Activity, Meal } from '@/types'

interface ItineraryState {
  // 编辑模式状态
  isEditMode: boolean
  originalTrip: Trip | null  // 原始数据备份（用于取消恢复）
  editingTrip: Trip | null   // 编辑中的工作副本

  // 编辑模式控制
  enterEditMode: (trip: Trip) => void
  exitEditMode: () => void

  // 保存和取消
  saveChanges: () => Promise<void>
  discardChanges: () => void

  // 活动管理
  deleteActivity: (dayIndex: number, activityIndex: number) => void
  addActivity: (dayIndex: number, activity: Activity) => void

  // 餐饮管理
  deleteMeal: (dayIndex: number, mealIndex: number) => void
  addMeal: (dayIndex: number, meal: Meal) => void
}

/**
 * 行程编辑状态管理 Store
 * 支持编辑模式切换、添加/删除活动、保存/取消修改
 */
export const useItineraryStore = create<ItineraryState>((set, get) => ({
  isEditMode: false,
  originalTrip: null,
  editingTrip: null,

  // 进入编辑模式
  enterEditMode: (trip: Trip) => {
    set({
      isEditMode: true,
      originalTrip: JSON.parse(JSON.stringify(trip)), // 深拷贝原始数据
      editingTrip: JSON.parse(JSON.stringify(trip)),  // 深拷贝工作副本
    })
  },

  // 退出编辑模式（不保存）
  exitEditMode: () => {
    set({
      isEditMode: false,
      originalTrip: null,
      editingTrip: null,
    })
  },

  // 保存修改到数据库
  saveChanges: async () => {
    const { editingTrip } = get()

    if (!editingTrip) {
      throw new Error('No trip being edited')
    }

    try {
      // 动态导入 supabase 客户端
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No active session')
      }

      // 调用 API 更新行程数据
      const response = await fetch(`/api/trips/${editingTrip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          itinerary: editingTrip.itinerary,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save changes')
      }

      // 保存成功，退出编辑模式
      set({
        isEditMode: false,
        originalTrip: null,
        editingTrip: null,
      })
    } catch (error) {
      console.error('Error saving changes:', error)
      throw error
    }
  },

  // 放弃修改，恢复到原始状态
  discardChanges: () => {
    const { originalTrip } = get()

    if (!originalTrip) {
      throw new Error('No original trip to restore')
    }

    set({
      editingTrip: JSON.parse(JSON.stringify(originalTrip)), // 恢复为原始数据
    })
  },

  // 删除活动
  deleteActivity: (dayIndex: number, activityIndex: number) => {
    const { editingTrip } = get()

    if (!editingTrip?.itinerary?.days) {
      return
    }

    const newTrip = JSON.parse(JSON.stringify(editingTrip))
    newTrip.itinerary.days[dayIndex].activities.splice(activityIndex, 1)

    set({ editingTrip: newTrip })
  },

  // 添加活动
  addActivity: (dayIndex: number, activity: Activity) => {
    const { editingTrip } = get()

    if (!editingTrip?.itinerary?.days) {
      return
    }

    const newTrip = JSON.parse(JSON.stringify(editingTrip))
    newTrip.itinerary.days[dayIndex].activities.push(activity)

    set({ editingTrip: newTrip })
  },

  // 删除餐饮
  deleteMeal: (dayIndex: number, mealIndex: number) => {
    const { editingTrip } = get()

    if (!editingTrip?.itinerary?.days) {
      return
    }

    const newTrip = JSON.parse(JSON.stringify(editingTrip))
    newTrip.itinerary.days[dayIndex].meals.splice(mealIndex, 1)

    set({ editingTrip: newTrip })
  },

  // 添加餐饮
  addMeal: (dayIndex: number, meal: Meal) => {
    const { editingTrip } = get()

    if (!editingTrip?.itinerary?.days) {
      return
    }

    const newTrip = JSON.parse(JSON.stringify(editingTrip))
    newTrip.itinerary.days[dayIndex].meals.push(meal)

    set({ editingTrip: newTrip })
  },
}))
