'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import {
  getPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthText,
  validatePasswordRequirements,
} from '@/lib/utils/password'

export default function PasswordChangeForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const strength = getPasswordStrength(formData.new_password)
  const requirements = validatePasswordRequirements(formData.new_password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setMessage({ type: 'error', text: '请先登录' })
        return
      }

      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ||'修改失败')
      }

      setMessage({ type: 'success', text: data.message })
      setFormData({ current_password: '', new_password: '', confirm_password: '' })

      // 3秒后跳转到登录页
      setTimeout(() => {
        window.location.href = '/login'
      }, 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 当前密码 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            当前密码
          </label>
          <div className="relative">
            <Input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.current_password}
              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 新密码 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            新密码
          </label>
          <div className="relative">
            <Input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* 密码强度指示器 */}
          {formData.new_password && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getPasswordStrengthColor(strength)}`}
                    style={{ width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%' }}
                  />
                </div>
                <span className="text-sm font-medium">{getPasswordStrengthText(strength)}</span>
              </div>

              {/* 要求列表 */}
              <div className="space-y-1">
                {requirements.map((req, i) => (
                  <div key={i} className={`text-xs flex items-center gap-2 ${req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {req.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {req.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 确认密码 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            确认新密码
          </label>
          <div className="relative">
            <Input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {formData.confirm_password && formData.new_password !== formData.confirm_password && (
            <p className="text-xs text-red-600 dark:text-red-400">两次输入的密码不一致</p>
          )}
        </div>

        {/* 消息 */}
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* 提交 */}
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />修改中...</> : '修改密码'}
        </Button>
      </form>
    </div>
  )
}
