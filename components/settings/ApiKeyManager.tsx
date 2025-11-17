'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Loader2, Key, Trash2, Check, X, TestTube, Upload, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddApiKeyModal from './AddApiKeyModal'
import { supabase } from '@/lib/supabase'
import type { ApiKey, ApiKeyService } from '@/types'

interface SystemApiKey {
  service: ApiKeyService
  key_name: string
  key_prefix: string
  is_active: boolean
  is_system: true
}

interface ServiceGroup {
  id: ApiKeyService
  name: string
  icon: string
  userKeys: ApiKey[]
  systemKeys: SystemApiKey[]
}

export default function ApiKeyManager() {
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [systemKeys, setSystemKeys] = useState<SystemApiKey[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      // 加载用户 API Keys
      const userResponse = await fetch('/api/user/api-keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (userResponse.ok) {
        const result = await userResponse.json()
        const keys = result.data?.apiKeys || []
        setApiKeys(keys)
      }

      // 加载系统默认 API Keys
      const systemResponse = await fetch('/api/user/api-keys/system', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (systemResponse.ok) {
        const result = await systemResponse.json()
        const sysKeys = result.data?.systemKeys || result.systemKeys || []
        setSystemKeys(sysKeys)
      }
    } catch (error) {
      console.error('Load API keys error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportFromEnv = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)

    try {
      const content = await file.text()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('请先登录')
        return
      }

      const response = await fetch('/api/user/api-keys/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ envContent: content }),
      })

      const data = await response.json()

      if (response.ok) {
        const { imported, skipped, errors, total } = data
        let message = `导入完成！\n\n`
        message += `✅ 成功导入: ${imported.length} 个\n`
        if (imported.length > 0) {
          message += imported.map((k: string) => `  - ${k}`).join('\n') + '\n'
        }
        if (skipped.length > 0) {
          message += `\n⚠️ 跳过: ${skipped.length} 个\n`
          message += skipped.map((k: string) => `  - ${k}`).join('\n') + '\n'
        }
        if (errors.length > 0) {
          message += `\n❌ 失败: ${errors.length} 个\n`
          message += errors.map((k: string) => `  - ${k}`).join('\n')
        }

        alert(message)
        loadApiKeys()
      } else {
        alert('❌ ' + (data.error || '导入失败'))
      }
    } catch (error) {
      alert('读取文件失败，请确保文件格式正确')
    } finally {
      setImporting(false)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
      id: 'deepseek',
      name: 'DeepSeek',
      icon: '🧠',
      userKeys: apiKeys.filter((k) => k.service === 'deepseek'),
      systemKeys: systemKeys.filter((k) => k.service === 'deepseek'),
    },
    {
      id: 'modelscope',
      name: 'ModelScope (Qwen)',
      icon: '🌐',
      userKeys: apiKeys.filter((k) => k.service === 'modelscope'),
      systemKeys: systemKeys.filter((k) => k.service === 'modelscope'),
    },
    {
      id: 'map',
      name: '高德地图 Web 服务',
      icon: '🗺️',
      userKeys: apiKeys.filter((k) => k.service === 'map'),
      systemKeys: systemKeys.filter((k) => k.service === 'map'),
    },
    {
      id: 'voice',
      name: '科大讯飞语音',
      icon: '🎤',
      userKeys: apiKeys.filter((k) => k.service === 'voice'),
      systemKeys: systemKeys.filter((k) => k.service === 'voice'),
    },
  ]

  // 检测未配置的关键服务
  const mapSystemKeys = systemKeys.filter((k) => k.service === 'map')
  const hasFrontendMapKey = mapSystemKeys.some((k) => k.key_name.includes('前端'))
  const hasBackendMapKey = mapSystemKeys.some((k) => k.key_name.includes('后端'))
  const mapUserKeys = apiKeys.filter((k) => k.service === 'map')

  // 判断是否缺少后端地图 Key（前端 Key 必须在 .env.local 配置，后端 Key 可选）
  const missingBackendMapKey = !hasBackendMapKey && mapUserKeys.length === 0

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromEnv} disabled={importing}>
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
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加 Key
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".env,.env.local,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Missing Configuration Warnings */}
      {(missingBackendMapKey || !hasFrontendMapKey) && (
        <div className="space-y-3">
          {!hasFrontendMapKey && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                    ⚠️ 未配置高德地图前端 JS API Key
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-400">
                    地图功能将无法使用。请在 <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">.env.local</code> 文件中配置 <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">NEXT_PUBLIC_MAP_API_KEY</code>，然后重启开发服务器。
                  </p>
                </div>
              </div>
            </div>
          )}

          {missingBackendMapKey && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                    ⚠️ 未配置高德地图 Web 服务 API Key
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                    将影响以下功能：景点坐标准确度、景点真实照片获取、地理编码服务。
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500">
                    您可以：
                    <br />
                    1. 在下方"高德地图 Web 服务"区域点击"添加 Key"按钮配置
                    <br />
                    2. 或在 <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">.env.local</code> 文件中配置 <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">AMAP_WEB_SERVICE_KEY</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                (系统 {group.systemKeys.length} · 用户 {group.userKeys.length})
              </span>
            </div>

            {/* System Keys List */}
            {group.systemKeys.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-10 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  系统默认配置
                </div>
                {group.systemKeys.map((key, idx) => (
                  <div
                    key={`system-${key.service}-${idx}`}
                    className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {key.key_name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              系统
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {key.key_prefix}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* User Keys List */}
            {group.userKeys.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 pl-10">
                {group.systemKeys.length === 0 ? '暂无 API Key' : '暂无用户自定义 Key'}
              </div>
            ) : (
              <div className="space-y-2">
                {group.systemKeys.length > 0 && (
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-10 flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    用户自定义 Keys
                  </div>
                )}
                {group.userKeys.map((key) => (
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
                          {key.base_url && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              URL: {key.base_url}
                            </div>
                          )}
                          {key.extra_config && (() => {
                            try {
                              const config = JSON.parse(key.extra_config)
                              return (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {Object.keys(config).length > 0 && `额外配置: ${Object.keys(config).join(', ')}`}
                                </div>
                              )
                            } catch {
                              return null
                            }
                          })()}
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

      {/* Map Service Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-2">
          🗺️ 关于高德地图配置
        </h4>
        <div className="text-sm text-amber-800 dark:text-amber-400 space-y-2">
          <p>高德地图需要两个不同的 API Key：</p>
          <ul className="space-y-1 list-disc list-inside ml-2">
            <li>
              <strong>前端 JS API Key</strong>：用于地图显示、路线规划（必须在 .env.local 中配置）
            </li>
            <li>
              <strong>后端 Web 服务 Key</strong>：用于地理编码、POI 搜索、景点照片（在此处配置）
            </li>
          </ul>
          <p className="text-xs mt-2">
            💡 提示：如果不配置后端 Key，地图仍可显示，但景点坐标可能不够准确，且无法获取真实照片。
          </p>
        </div>
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
