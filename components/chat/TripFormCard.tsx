'use client'

/**
 * TripFormCard - 对话内表单预览卡片
 * 展示 AI 提取的旅行信息，供用户确认或修改
 */

import React from 'react'
import type { TripFormData, TripFormValidation } from '@/lib/chat/types'

interface TripFormCardProps {
  formData: Partial<TripFormData>
  validation: TripFormValidation
  onEdit: () => void
  onConfirm: () => void
  onCancel: () => void
  isGenerating?: boolean
}

/**
 * 住宿偏好标签映射
 */
const ACCOMMODATION_LABELS: Record<string, string> = {
  budget: '经济型',
  mid: '舒适型',
  luxury: '豪华型',
}

/**
 * 交通偏好标签映射
 */
const TRANSPORT_LABELS: Record<string, string> = {
  public: '公共交通',
  driving: '自驾',
  mixed: '混合',
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * 计算行程天数
 */
function calculateDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  } catch {
    return 0
  }
}

export default function TripFormCard({
  formData,
  validation,
  onEdit,
  onConfirm,
  onCancel,
  isGenerating = false,
}: TripFormCardProps) {
  const days = calculateDays(formData.startDate, formData.endDate)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden max-w-md">
      {/* 头部 */}
      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">行程规划确认</h3>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4 space-y-3">
        {/* 目的地 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">目的地</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formData.destination || <span className="text-red-500">未填写</span>}
          </span>
        </div>

        {/* 日期 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">日期</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formData.startDate && formData.endDate ? (
              <>
                {formatDate(formData.startDate)} ~ {formatDate(formData.endDate)}
                <span className="text-blue-600 dark:text-blue-400 ml-1">({days}天)</span>
              </>
            ) : (
              <span className="text-red-500">未填写</span>
            )}
          </span>
        </div>

        {/* 预算 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">预算</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formData.budget ? (
              `¥${formData.budget.toLocaleString()}`
            ) : (
              <span className="text-red-500">未填写</span>
            )}
          </span>
        </div>

        {/* 人数 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">人数</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formData.travelers ? (
              `${formData.travelers}人`
            ) : (
              <span className="text-red-500">未填写</span>
            )}
          </span>
        </div>

        {/* 出发地（可选） */}
        {formData.origin && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">出发地</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formData.origin}
            </span>
          </div>
        )}

        {/* 偏好 */}
        {formData.preferences && formData.preferences.length > 0 && (
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400">偏好</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
              {formData.preferences.map((pref, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                >
                  {pref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 住宿偏好 */}
        {formData.accommodation_preference && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">住宿</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {ACCOMMODATION_LABELS[formData.accommodation_preference] || formData.accommodation_preference}
            </span>
          </div>
        )}

        {/* 交通偏好 */}
        {formData.transport_preference && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">交通</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {TRANSPORT_LABELS[formData.transport_preference] || formData.transport_preference}
            </span>
          </div>
        )}

        {/* 特殊要求 */}
        {formData.special_requirements && (
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400">备注</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[200px]">
              {formData.special_requirements}
            </span>
          </div>
        )}
      </div>

      {/* 验证状态 */}
      {!validation.isValid && validation.missingRequired.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <span>⚠️</span>
            <span>缺少必填信息：{validation.missingRequired.join('、')}</span>
          </div>
        </div>
      )}

      {/* 可选信息提示 */}
      {validation.isValid && validation.missingOptional.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>💡</span>
            <span>可选信息：{validation.missingOptional.join('、')}</span>
          </div>
        </div>
      )}

      {/* 按钮区 */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={onEdit}
          disabled={isGenerating}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          修改详情
        </button>
        <button
          onClick={onConfirm}
          disabled={!validation.isValid || isGenerating}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              生成中...
            </>
          ) : (
            <>
              <span>✨</span>
              确认生成
            </>
          )}
        </button>
      </div>
    </div>
  )
}
