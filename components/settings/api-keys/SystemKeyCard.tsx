'use client'

import { Key } from 'lucide-react'

interface SystemKeyCardProps {
  keyName: string
  keyPrefix: string
}

/**
 * 系统 API Key 卡片组件
 * 显示单个系统默认配置的 API Key（只读）
 */
export default function SystemKeyCard({ keyName, keyPrefix }: SystemKeyCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {keyName}
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                系统
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {keyPrefix}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
