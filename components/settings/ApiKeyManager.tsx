'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import AddApiKeyModal from './AddApiKeyModal'
import ApiKeyHeader from './api-keys/ApiKeyHeader'
import ConfigurationWarnings from './api-keys/ConfigurationWarnings'
import ServiceGroup from './api-keys/ServiceGroup'
import InfoBox from './api-keys/InfoBox'
import { supabase } from '@/lib/database'
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
      <ApiKeyHeader
        onImport={handleImportFromEnv}
        onAdd={() => setIsModalOpen(true)}
        importing={importing}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".env,.env.local,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Missing Configuration Warnings */}
      <ConfigurationWarnings
        missingFrontendMapKey={!hasFrontendMapKey}
        missingBackendMapKey={missingBackendMapKey}
      />

      {/* Service Groups */}
      <div className="space-y-6">
        {serviceGroups.map((group) => (
          <ServiceGroup
            key={group.id}
            name={group.name}
            icon={group.icon}
            systemKeys={group.systemKeys}
            userKeys={group.userKeys}
            testingKeyId={testingKeyId}
            onTest={handleTest}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Info Box */}
      <InfoBox title="💡 使用说明" variant="blue">
        <ul className="space-y-1 list-disc list-inside">
          <li>添加 API Key 后，系统将优先使用您的 Key 生成行程</li>
          <li>每个服务可以添加多个 Key，只有激活的 Key 才会被使用</li>
          <li>Key 使用 AES-256 加密存储，安全可靠</li>
          <li>点击测试按钮可以验证 Key 是否有效</li>
        </ul>
      </InfoBox>

      {/* Map Service Info */}
      <InfoBox title="🗺️ 关于高德地图配置" variant="amber">
        <div className="space-y-2">
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
      </InfoBox>

      {/* Add Modal */}
      <AddApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadApiKeys}
      />
    </div>
  )
}
