'use client'

import { Upload, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ApiKeyHeaderProps {
  onImport: () => void
  onAdd: () => void
  importing: boolean
}

/**
 * API Key 管理页面头部组件
 * 包含标题、描述和操作按钮
 */
export default function ApiKeyHeader({ onImport, onAdd, importing }: ApiKeyHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          我的 API Keys
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          添加您自己的 API Keys，将替代系统默认配置
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onImport} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              导入中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              从 .env.local 导入
            </>
          )}
        </Button>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          添加 Key
        </Button>
      </div>
    </div>
  )
}
