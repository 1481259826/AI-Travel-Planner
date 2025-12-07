'use client'

/**
 * TripFormModal - 表单编辑模态框
 * 提供完整的表单编辑能力
 */

import React, { useState, useEffect } from 'react'
import type { TripFormData } from '@/lib/chat/types'

interface TripFormModalProps {
  isOpen: boolean
  formData: Partial<TripFormData>
  onClose: () => void
  onSubmit: (formData: TripFormData) => void
  isSubmitting?: boolean
}

/**
 * 偏好选项
 */
const PREFERENCE_OPTIONS = [
  '美食',
  '文化古迹',
  '自然风光',
  '购物',
  '亲子',
  '摄影',
  '休闲度假',
  '户外运动',
  '夜生活',
  '艺术展览',
]

/**
 * 住宿偏好选项
 */
const ACCOMMODATION_OPTIONS = [
  { value: 'budget', label: '经济型', desc: '青旅、快捷酒店' },
  { value: 'mid', label: '舒适型', desc: '三四星酒店' },
  { value: 'luxury', label: '豪华型', desc: '五星酒店、度假村' },
]

/**
 * 交通偏好选项
 */
const TRANSPORT_OPTIONS = [
  { value: 'public', label: '公共交通', desc: '地铁、公交、出租车' },
  { value: 'driving', label: '自驾', desc: '租车自驾' },
  { value: 'mixed', label: '混合', desc: '根据情况灵活选择' },
]

export default function TripFormModal({
  isOpen,
  formData: initialFormData,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TripFormModalProps) {
  const [formData, setFormData] = useState<Partial<TripFormData>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      setFormData({
        destination: initialFormData.destination || '',
        startDate: initialFormData.startDate || '',
        endDate: initialFormData.endDate || '',
        budget: initialFormData.budget || undefined,
        travelers: initialFormData.travelers || 1,
        origin: initialFormData.origin || '',
        preferences: initialFormData.preferences || [],
        accommodation_preference: initialFormData.accommodation_preference,
        transport_preference: initialFormData.transport_preference,
        special_requirements: initialFormData.special_requirements || '',
      })
      setErrors({})
    }
  }, [isOpen, initialFormData])

  // 验证表单
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.destination?.trim()) {
      newErrors.destination = '请输入目的地'
    }
    if (!formData.startDate) {
      newErrors.startDate = '请选择开始日期'
    }
    if (!formData.endDate) {
      newErrors.endDate = '请选择结束日期'
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = '结束日期不能早于开始日期'
      }
    }
    if (!formData.budget || formData.budget <= 0) {
      newErrors.budget = '请输入有效预算'
    }
    if (!formData.travelers || formData.travelers <= 0) {
      newErrors.travelers = '请输入出行人数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData as TripFormData)
    }
  }

  // 切换偏好
  const togglePreference = (pref: string) => {
    const current = formData.preferences || []
    if (current.includes(pref)) {
      setFormData({
        ...formData,
        preferences: current.filter((p) => p !== pref),
      })
    } else {
      setFormData({
        ...formData,
        preferences: [...current, pref],
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              编辑行程信息
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 目的地 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目的地 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.destination || ''}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="如：杭州、北京"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.destination ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-500">{errors.destination}</p>
            )}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                开始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                结束日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* 预算和人数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                预算（元） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || undefined })}
                placeholder="5000"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.budget ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.budget && (
                <p className="mt-1 text-sm text-red-500">{errors.budget}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                出行人数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.travelers || ''}
                onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) || undefined })}
                placeholder="2"
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.travelers ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.travelers && (
                <p className="mt-1 text-sm text-red-500">{errors.travelers}</p>
              )}
            </div>
          </div>

          {/* 出发地 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              出发地（可选）
            </label>
            <input
              type="text"
              value={formData.origin || ''}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="如：上海"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* 旅行偏好 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              旅行偏好（可选）
            </label>
            <div className="flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.preferences?.includes(pref)
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* 住宿偏好 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              住宿偏好（可选）
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOMMODATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, accommodation_preference: opt.value as any })}
                  className={`p-2 text-center border rounded-lg transition-colors ${
                    formData.accommodation_preference === opt.value
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className={`text-sm font-medium ${
                    formData.accommodation_preference === opt.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 交通偏好 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              交通偏好（可选）
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, transport_preference: opt.value as any })}
                  className={`p-2 text-center border rounded-lg transition-colors ${
                    formData.transport_preference === opt.value
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className={`text-sm font-medium ${
                    formData.transport_preference === opt.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 特殊要求 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              特殊要求（可选）
            </label>
            <textarea
              value={formData.special_requirements || ''}
              onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
              placeholder="如：需要无障碍设施、素食餐厅等"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </form>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                生成中...
              </>
            ) : (
              <>
                <span>🚀</span>
                确认生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
