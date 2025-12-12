/**
 * 保存模板弹窗组件
 * 用于保存新模板或从行程保存模板
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import {
  TEMPLATE_CATEGORY_CONFIG,
  type TemplateCategory,
  type TemplateFormData,
} from '@/lib/templates'

interface TemplateSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SaveTemplateData) => Promise<void>
  initialData?: Partial<TemplateFormData>
  tripId?: string // 如果从行程保存
  defaultName?: string
}

export interface SaveTemplateData {
  name: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  formData?: TemplateFormData
  tripId?: string
}

export default function TemplateSaveModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  tripId,
  defaultName,
}: TemplateSaveModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [tagsInput, setTagsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setName(defaultName || (initialData?.destination ? `${initialData.destination}之旅` : ''))
      setDescription('')
      setCategory('custom')
      setTagsInput('')
      setError(null)
    }
  }, [isOpen, defaultName, initialData?.destination])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('请输入模板名称')
      return
    }

    if (name.length > 100) {
      setError('模板名称不能超过 100 个字符')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)

      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tags: tags.length > 0 ? tags : undefined,
        formData: initialData as TemplateFormData,
        tripId,
      })

      onClose()
    } catch (err) {
      console.error('保存模板失败:', err)
      setError(err instanceof Error ? err.message : '保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onKeyDown={handleKeyDown}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            保存为模板
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <div className="px-6 py-4 space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模板名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`如：${initialData?.destination || '杭州'}周末游`}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述 <span className="text-gray-400 text-xs">（可选）</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个模板的特点..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TEMPLATE_CATEGORY_CONFIG) as TemplateCategory[]).map(
                (cat) => {
                  const config = TEMPLATE_CATEGORY_CONFIG[cat]
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        category === cat
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{config.emoji}</span>
                      <span className="truncate">{config.label}</span>
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标签 <span className="text-gray-400 text-xs">（可选）</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="用逗号或空格分隔，如：周末游 亲子 美食"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 预览 */}
          {initialData && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                模板内容预览
              </p>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p>
                  <span className="text-gray-500">目的地：</span>
                  {initialData.destination}
                </p>
                <p>
                  <span className="text-gray-500">天数：</span>
                  {initialData.durationDays}天
                </p>
                <p>
                  <span className="text-gray-500">预算：</span>¥
                  {initialData.budget?.toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-500">人数：</span>
                  {initialData.travelers}人
                </p>
                {initialData.preferences && initialData.preferences.length > 0 && (
                  <p>
                    <span className="text-gray-500">偏好：</span>
                    {initialData.preferences.join('、')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存模板'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
