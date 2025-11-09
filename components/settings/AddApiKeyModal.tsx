'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import type { ApiKeyService } from '@/types'

interface AddApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ServiceInfo {
  id: ApiKeyService
  name: string
  placeholder: string
  helpText: string
}

const services: ServiceInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    placeholder: 'sk-ant-api03-...',
    helpText: '在 Anthropic Console 获取 API Key',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    placeholder: 'sk-...',
    helpText: '在 DeepSeek Platform 获取 API Key',
  },
  {
    id: 'modelscope',
    name: 'ModelScope (Qwen)',
    placeholder: 'ms-...',
    helpText: '在 ModelScope 体验平台获取 API Key',
  },
  {
    id: 'map',
    name: '高德地图',
    placeholder: '您的高德地图 Web 服务 Key',
    helpText: '在高德开放平台获取 Web 服务 API Key',
  },
  {
    id: 'voice',
    name: '科大讯飞语音',
    placeholder: '您的讯飞语音 API Key',
    helpText: '在讯飞开放平台获取语音听写 API Key',
  },
]

export default function AddApiKeyModal({ isOpen, onClose, onSuccess }: AddApiKeyModalProps) {
  const [loading, setLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [formData, setFormData] = useState({
    service: 'anthropic' as ApiKeyService,
    key_name: '',
    api_key: '',
  })

  const selectedService = services.find((s) => s.id === formData.service)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('请先登录')
        return
      }

      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
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
        service: 'anthropic',
        key_name: '',
        api_key: '',
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
              onChange={(e) => setFormData({ ...formData, service: e.target.value as ApiKeyService })}
              className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
              required
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedService?.helpText}
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
                placeholder={selectedService?.placeholder}
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
