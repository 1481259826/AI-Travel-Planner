'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ThemeToggle from '@/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { AI_MODELS } from '@/lib/config'
import type { UserProfile, AIModel } from '@/types'

export default function PreferencesForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    default_model: '' as AIModel | '',
    default_budget: '',
    default_origin: '',
  })

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setMessage({ type: 'error', text: '请先登录' })
        return
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to load')

      const result = await response.json()
      const profile = result.data?.profile

      if (!profile) {
        throw new Error('Profile data not found')
      }

      setFormData({
        default_model: profile.default_model || '',
        default_budget: profile.default_budget?.toString() || '',
        default_origin: profile.default_origin || '',
      })
    } catch (error) {
      setMessage({ type: 'error', text: '加载失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setMessage({ type: 'error', text: '请先登录' })
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          default_model: formData.default_model || null,
          default_budget: formData.default_budget ? parseFloat(formData.default_budget) : null,
          default_origin: formData.default_origin || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      setMessage({ type: 'success', text: '保存成功！' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* 主题设置 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">主题设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">选择您偏好的界面主题</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="border-t dark:border-gray-700 pt-6" />

      {/* 默认偏好 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">创建行程默认值</h3>
          <div className="space-y-4">
            {/* 默认模型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">默认 AI 模型</label>
              <select
                value={formData.default_model}
                onChange={(e) => setFormData({ ...formData, default_model: e.target.value as AIModel })}
                className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white"
              >
                <option value="">不设置默认</option>
                {AI_MODELS.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>

            {/* 默认预算 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">默认预算 (¥)</label>
              <Input
                type="number"
                value={formData.default_budget}
                onChange={(e) => setFormData({ ...formData, default_budget: e.target.value })}
                placeholder="5000"
                min="0"
                step="100"
              />
            </div>

            {/* 默认出发地 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">常用出发地</label>
              <Input
                type="text"
                value={formData.default_origin}
                onChange={(e) => setFormData({ ...formData, default_origin: e.target.value })}
                placeholder="例如: 上海、深圳、广州"
              />
            </div>
          </div>
        </div>

        {/* 消息 */}
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* 提交 */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : '保存更改'}
          </Button>
          <Button type="button" variant="outline" onClick={loadPreferences} disabled={saving}>重置</Button>
        </div>
      </form>
    </div>
  )
}
