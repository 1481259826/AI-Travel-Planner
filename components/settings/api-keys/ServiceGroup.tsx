'use client'

import { Shield, Key } from 'lucide-react'
import SystemKeyCard from './SystemKeyCard'
import UserKeyCard from './UserKeyCard'
import type { ApiKey } from '@/types'

interface SystemApiKey {
  key_name: string
  key_prefix: string
}

interface ServiceGroupProps {
  /** 服务名称 */
  name: string
  /** 服务图标 */
  icon: string
  /** 系统 Keys */
  systemKeys: SystemApiKey[]
  /** 用户 Keys */
  userKeys: ApiKey[]
  /** 当前正在测试的 Key ID */
  testingKeyId: string | null
  /** 测试 Key 回调 */
  onTest: (keyId: string) => void
  /** 切换激活状态回调 */
  onToggleActive: (keyId: string, currentStatus: boolean) => void
  /** 删除 Key 回调 */
  onDelete: (keyId: string) => void
}

/**
 * API Key 服务分组组件
 * 按服务类型显示系统和用户的 API Keys
 */
export default function ServiceGroup({
  name,
  icon,
  systemKeys,
  userKeys,
  testingKeyId,
  onTest,
  onToggleActive,
  onDelete
}: ServiceGroupProps) {
  return (
    <div className="space-y-3">
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h4 className="text-md font-medium text-gray-900 dark:text-white">
          {name}
        </h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          (系统 {systemKeys.length} · 用户 {userKeys.length})
        </span>
      </div>

      {/* System Keys List */}
      {systemKeys.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-10 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            系统默认配置
          </div>
          {systemKeys.map((key, idx) => (
            <SystemKeyCard
              key={`system-${idx}`}
              keyName={key.key_name}
              keyPrefix={key.key_prefix}
            />
          ))}
        </div>
      )}

      {/* User Keys List */}
      {userKeys.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 pl-10">
          {systemKeys.length === 0 ? '暂无 API Key' : '暂无用户自定义 Key'}
        </div>
      ) : (
        <div className="space-y-2">
          {systemKeys.length > 0 && (
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-10 flex items-center gap-1">
              <Key className="w-3 h-3" />
              用户自定义 Keys
            </div>
          )}
          {userKeys.map((key) => (
            <UserKeyCard
              key={key.id}
              apiKey={key}
              isTesting={testingKeyId === key.id}
              onTest={() => onTest(key.id)}
              onToggleActive={() => onToggleActive(key.id, key.is_active)}
              onDelete={() => onDelete(key.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
