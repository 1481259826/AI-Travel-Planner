'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plane, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import VoiceInput from '@/components/VoiceInput'
import ModelSelector from '@/components/ModelSelector'
import { supabase } from '@/lib/supabase'
import { TripFormData, AIModel } from '@/types'
import { getDefaultModel } from '@/lib/models'

export default function CreateTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TripFormData>({
    destination: '',
    start_date: '',
    end_date: '',
    budget: 5000,
    travelers: 1,
    adult_count: 1,
    child_count: 0,
    preferences: [],
    additional_notes: '',
    model: getDefaultModel().id as AIModel,
  })

  const preferenceOptions = [
    '美食',
    '购物',
    '文化古迹',
    '自然风光',
    '亲子游',
    '摄影',
    '冒险探险',
    '休闲度假',
  ]

  const handleVoiceTranscript = (text: string) => {
    // Simple voice command parsing
    // You can enhance this with more sophisticated NLP
    setFormData(prev => ({
      ...prev,
      additional_notes: prev.additional_notes + ' ' + text,
    }))
  }

  const togglePreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('请先登录')
        router.push('/login')
        return
      }

      // Call API to generate itinerary
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/dashboard/trips/${data.trip_id}`)
      } else {
        const error = await response.json()
        alert(error.error || '生成行程失败，请重试')
      }
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">创建新行程</h1>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>输入旅行信息</CardTitle>
              <CardDescription>
                填写下方表单或使用语音输入，AI 将为您生成详细的旅行计划
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">目的地 *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例如: 北京、东京、巴黎"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      required
                    />
                    <VoiceInput
                      onTranscript={(text) => setFormData({ ...formData, destination: text })}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">出发日期 *</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">返回日期 *</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">预算 (¥) *</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                {/* Travelers */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">总人数 *</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">成人数</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.adult_count}
                      onChange={(e) => setFormData({ ...formData, adult_count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">儿童数</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.child_count}
                      onChange={(e) => setFormData({ ...formData, child_count: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">旅行偏好</label>
                  <div className="flex flex-wrap gap-2">
                    {preferenceOptions.map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => togglePreference(pref)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          formData.preferences.includes(pref)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">补充说明</label>
                  <div className="space-y-2">
                    <textarea
                      className="flex min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="任何特殊要求或偏好..."
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    />
                    <VoiceInput onTranscript={handleVoiceTranscript} className="w-full" />
                  </div>
                </div>

                {/* Model Selection */}
                <ModelSelector
                  selectedModel={formData.model || getDefaultModel().id as AIModel}
                  onModelChange={(model) => setFormData({ ...formData, model })}
                />

                {/* Submit Button */}
                <div className="pt-4">
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI 正在生成行程...
                      </>
                    ) : (
                      '生成旅行计划'
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}
