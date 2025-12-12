/**
 * 模板卡片组件
 * 用于在列表中展示单个模板
 */

'use client'

import React from 'react'
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  Tag,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react'
import {
  TEMPLATE_CATEGORY_CONFIG,
  getCategoryEmoji,
  type TemplateListItem,
  type TemplateCategory,
} from '@/lib/templates'

interface TemplateCardProps {
  template: TemplateListItem
  onEdit?: (template: TemplateListItem) => void
  onDelete?: (template: TemplateListItem) => void
  onApply?: (template: TemplateListItem) => void
  showActions?: boolean
}

export default function TemplateCard({
  template,
  onEdit,
  onDelete,
  onApply,
  showActions = true,
}: TemplateCardProps) {
  const categoryConfig = template.category
    ? TEMPLATE_CATEGORY_CONFIG[template.category]
    : null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      {/* 头部：名称和分类 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 truncate">
            <span className="text-lg flex-shrink-0">
              {getCategoryEmoji(template.category)}
            </span>
            <span className="truncate">{template.name}</span>
          </h3>
          {template.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(template)
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                title="编辑模板"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(template)
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="删除模板"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="space-y-2 text-sm">
        {/* 目的地 */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{template.destination}</span>
        </div>

        {/* 天数、人数、预算 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{template.durationDays}天</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{template.travelers}人</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Wallet className="w-4 h-4" />
            <span>¥{template.budget.toLocaleString()}</span>
          </div>
        </div>

        {/* 标签 */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 底部：使用统计和操作 */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            已使用 {template.useCount} 次
          </span>
          {template.lastUsedAt && (
            <span>上次使用: {formatDate(template.lastUsedAt)}</span>
          )}
        </div>
        {onApply && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onApply(template)
            }}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            使用此模板
          </button>
        )}
      </div>
    </div>
  )
}
