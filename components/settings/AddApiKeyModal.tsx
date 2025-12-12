'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/database'
import type { ApiKeyService } from '@/types'

interface AddApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ServiceConfig {
  id: ApiKeyService
  name: string
  placeholder: string
  helpText: string
  defaultBaseUrl?: string
  showBaseUrl: boolean
  extraFields?: {
    key: string
    label: string
    placeholder: string
    helpText: string
  }[]
}

const serviceConfigs: ServiceConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    placeholder: 'sk-...',
    helpText: '在 DeepSeek Platform 获取 API Key',
    defaultBaseUrl: 'https://api.deepseek.com',
    showBaseUrl: true,
  },
  {
    id: 'modelscope',
    name: 'ModelScope (Qwen)',
    placeholder: 'sk-...',
    helpText: '在 ModelScope 控制台获取 API Key',
    defaultBaseUrl: 'https://api-inference.modelscope.cn/v1/',
    showBaseUrl: true,
  },
  {
    id: 'map',
    name: '高德地图 Web 服务',
    placeholder: '您的高德地图 Web 服务 Key',
    helpText: '在高德开放平台获取 Web 服务 API Key（用于后端地理编码、POI 搜索、景点照片获取等）',
    showBaseUrl: false,
  },
  {
    id: 'voice',
    name: '科大讯飞语音',
    placeholder: '您的讯飞语音 API Key',
    helpText: '在讯飞开放平台获取语音听写 API Key，用于实时语音识别',
    showBaseUrl: false,
    extraFields: [
      {
        key: 'app_id',
        label: 'APP ID',
        placeholder: '您的讯飞应用 APP ID',
        helpText: '在讯飞开放平台创建应用后获得',
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        placeholder: '您的讯飞应用 API Secret',
        helpText: 'WebSocket 语音识别需要 API Secret 进行鉴权签名',
      },
    ],
  },
]

export default function AddApiKeyModal({ isOpen, onClose, onSuccess }: AddApiKeyModalProps) {
  const [loading, setLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [formData, setFormData] = useState({
    service: 'deepseek' as ApiKeyService,
    key_name: '',
    api_key: '',
    base_url: '',
    extra_fields: {} as Record<string, string>,
  })

  const selectedConfig = serviceConfigs.find((s) => s.id === formData.service)

  // 当切换服务时，重置表单
  const handleServiceChange = (newService: ApiKeyService) => {
    const newConfig = serviceConfigs.find((s) => s.id === newService)
    setFormData({
      service: newService,
      key_name: '',
      api_key: '',
      base_url: newConfig?.defaultBaseUrl || '',
      extra_fields: {},
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('请先登录')
        return
      }

      // 构建请求数据
      const requestData: any = {
        service: formData.service,
        key_name: formData.key_name,
        api_key: formData.api_key,
      }

      // 添加 base_url（如果有）
      if (formData.base_url && formData.base_url.trim()) {
        requestData.base_url = formData.base_url.trim()
      }

      // 添加额外字段（如果有）
      if (Object.keys(formData.extra_fields).length > 0) {
        // 过滤掉空值
        const filteredExtra = Object.entries(formData.extra_fields)
          .filter(([_, value]) => value && value.trim())
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value.trim() }), {})

        if (Object.keys(filteredExtra).length > 0) {
          requestData.extra_config = JSON.stringify(filteredExtra)
        }
      }

      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || '添加失败')
        throw new Error(errorMsg)
      }

      // 重置表单
      setFormData({
        service: 'deepseek',
        key_name: '',
        api_key: '',
        base_url: 'https://api.deepseek.com',
        extra_fields: {},
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      alert(error.message || '添加失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            添加 API Key
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 服务选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              服务类型
            </label>
            <select
              value={formData.service}
              onChange={(e) => handleServiceChange(e.target.value as ApiKeyService)}
              className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
              required
            >
              {serviceConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedConfig?.helpText}
            </p>
          </div>

          {/* Key 名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Key 名称
            </label>
            <Input
              type="text"
              value={formData.key_name}
              onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
              placeholder="例如: 我的主要 Key"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              给这个 Key 起一个便于识别的名称
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder={selectedConfig?.placeholder}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">
              ⚠️ Key 将使用 AES-256 加密存储，添加后无法查看完整内容
            </p>
          </div>

          {/* Base URL (如果支持) */}
          {selectedConfig?.showBaseUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                API 基础 URL（可选）
              </label>
              <Input
                type="url"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                placeholder={selectedConfig.defaultBaseUrl}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                如果使用代理或自定义端点，可在此修改。留空则使用默认 URL
              </p>
            </div>
          )}

          {/* 额外字段 */}
          {selectedConfig?.extraFields?.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
              </label>
              <Input
                type="text"
                value={formData.extra_fields[field.key] || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    extra_fields: {
                      ...formData.extra_fields,
                      [field.key]: e.target.value,
                    },
                  })
                }
                placeholder={field.placeholder}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {field.helpText}
              </p>
            </div>
          ))}

          {/* 提交按钮 */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  添加中...
                </>
              ) : (
                '添加 API Key'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
