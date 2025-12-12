/**
 * 模板管理组件
 * 用于在设置页面管理用户的旅行模板
 */

'use client'

import React, { useState, useCallback } from 'react'
import { RefreshCw, Search, Filter, BookTemplate } from 'lucide-react'
import { TemplateCard } from './TemplateCard'
import { TemplateEditModal } from './TemplateEditModal'
import { useTemplates } from '@/hooks/useTemplates'
import {
  TEMPLATE_CATEGORY_CONFIG,
  type TemplateCategory,
  type TemplateListItem,
  type UpdateTemplateParams,
} from '@/lib/templates'

export function TemplateManager() {
  const {
    templates,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    deleteTemplate,
    updateTemplate,
  } = useTemplates()

  const [editingTemplate, setEditingTemplate] = useState<TemplateListItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateListItem | null>(null)

  const handleSearch = useCallback(() => {
    setFilters({
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    })
  }, [searchQuery, selectedCategory, setFilters])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleDelete = async (template: TemplateListItem) => {
    setDeleteConfirm(template)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteTemplate(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('删除失败:', err)
      alert('删除失败，请重试')
    }
  }

  const handleUpdate = async (id: string, data: UpdateTemplateParams) => {
    await updateTemplate(id, data)
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookTemplate className="w-5 h-5" />
            旅行模板
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            管理您保存的旅行模板，快速复用常用配置
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="刷新"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索模板..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">全部分类</option>
          {(Object.keys(TEMPLATE_CATEGORY_CONFIG) as TemplateCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {TEMPLATE_CATEGORY_CONFIG[cat].emoji} {TEMPLATE_CATEGORY_CONFIG[cat].label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          筛选
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* 模板列表 */}
      {isLoading && templates.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <BookTemplate className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {filters.search || filters.category ? '没有找到匹配的模板' : '您还没有保存任何模板'}
          </p>
          <p className="text-sm text-gray-400">
            {filters.search || filters.category
              ? '尝试调整搜索条件'
              : '在创建行程后，可以将常用配置保存为模板，方便下次快速使用'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(t) => setEditingTemplate(t)}
              onDelete={handleDelete}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* 统计 */}
      {total > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          共 {total} 个模板
        </div>
      )}

      {/* 编辑弹窗 */}
      <TemplateEditModal
        isOpen={!!editingTemplate}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSave={handleUpdate}
      />

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              确定要删除模板「{deleteConfirm.name}」吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
