/**
 * 编辑模板弹窗组件
 * 用于编辑已有模板
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import {
  TEMPLATE_CATEGORY_CONFIG,
  type TemplateCategory,
  type TemplateListItem,
  type UpdateTemplateParams,
} from '@/lib/templates'

interface TemplateEditModalProps {
  isOpen: boolean
  template: TemplateListItem | null
  onClose: () => void
  onSave: (id: string, data: UpdateTemplateParams) => Promise<void>
}

export function TemplateEditModal({
  isOpen,
  template,
  onClose,
  onSave,
}: TemplateEditModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('custom')
  const [tagsInput, setTagsInput] = useState('')
  const [destination, setDestination] = useState('')
  const [durationDays, setDurationDays] = useState(3)
  const [budget, setBudget] = useState(3000)
  const [travelers, setTravelers] = useState(2)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category || 'custom')
      setTagsInput(template.tags?.join(', ') || '')
      setDestination(template.destination)
      setDurationDays(template.durationDays)
      setBudget(template.budget)
      setTravelers(template.travelers)
      setError(null)
    }
  }, [isOpen, template])

  if (!isOpen || !template) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('请输入模板名称')
      return
    }

    if (name.length > 100) {
      setError('模板名称不能超过 100 个字符')
      return
    }

    if (!destination.trim()) {
      setError('请输入目的地')
      return
    }

    if (budget <= 0) {
      setError('预算必须是正数')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)

      await onSave(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tags: tags.length > 0 ? tags : undefined,
        formData: {
          destination: destination.trim(),
          durationDays,
          budget,
          travelers,
        },
      })

      onClose()
    } catch (err) {
      console.error('更新模板失败:', err)
      setError(err instanceof Error ? err.message : '更新失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        {/* 头部 */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            编辑模板
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
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              标签
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="用逗号或空格分隔"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 分隔线 */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              模板内容
            </h3>

            {/* 目的地 */}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                目的地 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 天数、人数、预算 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  天数
                </label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={30}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  人数
                </label>
                <input
                  type="number"
                  value={travelers}
                  onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  预算
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !destination.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存修改
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
