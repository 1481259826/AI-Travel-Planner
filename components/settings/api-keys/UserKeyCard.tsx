'use client'

import { Key, TestTube, X, Check, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiKey } from '@/types'

interface UserKeyCardProps {
  apiKey: ApiKey
  isTesting: boolean
  onTest: () => void
  onToggleActive: () => void
  onDelete: () => void
}

/**
 * 用户 API Key 卡片组件
 * 显示单个用户自定义 API Key 及其操作
 */
export default function UserKeyCard({
  apiKey,
  isTesting,
  onTest,
  onToggleActive,
  onDelete
}: UserKeyCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Key className="w-4 h-4 text-gray-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {apiKey.key_name}
              </span>
              {apiKey.is_active ? (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                  已激活
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  未激活
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {apiKey.key_prefix}
            </div>
            {apiKey.base_url && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                URL: {apiKey.base_url}
              </div>
            )}
            {apiKey.extra_config && (() => {
              try {
                const config = JSON.parse(apiKey.extra_config)
                return (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {Object.keys(config).length > 0 && `额外配置: ${Object.keys(config).join(', ')}`}
                  </div>
                )
              } catch {
                return null
              }
            })()}
            {apiKey.last_used_at && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                最后使用: {new Date(apiKey.last_used_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Test Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTesting}
          title="测试 API Key"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <TestTube className="w-4 h-4" />
          )}
        </Button>

        {/* Toggle Active */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleActive}
          title={apiKey.is_active ? '停用' : '激活'}
        >
          {apiKey.is_active ? (
            <X className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 dark:text-red-400"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
