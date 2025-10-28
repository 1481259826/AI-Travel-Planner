'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Key, Trash2, Check, X, TestTube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddApiKeyModal from './AddApiKeyModal'
import { supabase } from '@/lib/supabase'
import type { ApiKey, ApiKeyService } from '@/types'

interface ServiceGroup {
  id: ApiKeyService
  name: string
  icon: string
  keys: ApiKey[]
}

export default function ApiKeyManager() {
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      const response = await fetch('/api/user/api-keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to load')

      const { apiKeys: keys } = await response.json()
      setApiKeys(keys)
    } catch (error) {
      console.error('Load API keys error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) throw new Error('Failed to update')

      // 更新本地状态
      setApiKeys((prev) =>
        prev.map((key) =>
          key.id === keyId ? { ...key, is_active: !currentStatus } : key
        )
      )
    } catch (error) {
      alert('操作失败，请重试')
    }
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm('确定要删除这个 API Key 吗？此操作不可恢复。')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to delete')

      // 从本地状态移除
      setApiKeys((prev) => prev.filter((key) => key.id !== keyId))
    } catch (error) {
      alert('删除失败，请重试')
    }
  }

  const handleTest = async (keyId: string) => {
    setTestingKeyId(keyId)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/user/api-keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ keyId }),
      })

      const data = await response.json()

      if (data.valid) {
        alert('✅ ' + data.message)
        // 更新 last_used_at
        loadApiKeys()
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      alert('测试失败，请检查网络连接')
    } finally {
      setTestingKeyId(null)
    }
  }

  // 按服务分组
  const serviceGroups: ServiceGroup[] = [
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      icon: '🤖',
      keys: apiKeys.filter((k) => k.service === 'anthropic'),
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      icon: '🧠',
      keys: apiKeys.filter((k) => k.service === 'deepseek'),
    },
    {
      id: 'map',
      name: '高德地图',
      icon: '🗺️',
      keys: apiKeys.filter((k) => k.service === 'map'),
    },
    {
      id: 'voice',
      name: '科大讯飞语音',
      icon: '🎤',
      keys: apiKeys.filter((k) => k.service === 'voice'),
    },
    {
      id: 'unsplash',
      name: 'Unsplash 图片',
      icon: '🖼️',
      keys: apiKeys.filter((k) => k.service === 'unsplash'),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            我的 API Keys
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            添加您自己的 API Keys，将替代系统默认配置
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加 Key
        </Button>
      </div>

      {/* Service Groups */}
      <div className="space-y-6">
        {serviceGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{group.icon}</span>
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                {group.name}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({group.keys.length})
              </span>
            </div>

            {/* Keys List */}
            {group.keys.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 pl-10">
                暂无 API Key
              </div>
            ) : (
              <div className="space-y-2">
                {group.keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {key.key_name}
                            </span>
                            {key.is_active ? (
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
                            {key.key_prefix}
                          </div>
                          {key.last_used_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              最后使用: {new Date(key.last_used_at).toLocaleString('zh-CN')}
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
                        onClick={() => handleTest(key.id)}
                        disabled={testingKeyId === key.id}
                      >
                        {testingKeyId === key.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Toggle Active */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(key.id, key.is_active)}
                      >
                        {key.is_active ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(key.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          💡 使用说明
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>添加 API Key 后，系统将优先使用您的 Key 生成行程</li>
          <li>每个服务可以添加多个 Key，只有激活的 Key 才会被使用</li>
          <li>Key 使用 AES-256 加密存储，安全可靠</li>
          <li>点击测试按钮可以验证 Key 是否有效</li>
        </ul>
      </div>

      {/* Add Modal */}
      <AddApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadApiKeys}
      />
    </div>
  )
}
