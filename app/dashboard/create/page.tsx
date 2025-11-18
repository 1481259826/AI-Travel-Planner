'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plane, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import VoiceInput from '@/components/VoiceInput'
import SmartVoiceFillForm from '@/components/SmartVoiceFillForm'
import ModelSelector from '@/components/ModelSelector'
import ProgressModal, { GenerationStage } from '@/components/ProgressModal'
import { supabase } from '@/lib/supabase'
import { TripFormData, AIModel } from '@/types'
import { getDefaultModel } from '@/lib/config'
import { ApiKeyChecker } from '@/lib/api-keys'

// 定义生成阶段
const GENERATION_STAGES: Omit<GenerationStage, 'progress' | 'status'>[] = [
  {
    id: 'search',
    name: '正在搜索景点和餐厅',
    description: '根据您的偏好查找最佳目的地...',
  },
  {
    id: 'weather',
    name: '正在获取天气信息',
    description: '了解目的地天气情况，优化行程安排...',
  },
  {
    id: 'optimize',
    name: '正在优化路线规划',
    description: '安排最合理的游览顺序...',
  },
  {
    id: 'description',
    name: '正在生成景点描述',
    description: '为每个景点添加详细介绍...',
  },
  {
    id: 'finalize',
    name: '正在完成最后调整',
    description: '整合所有信息，生成完整行程...',
  },
]

export default function CreateTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [currentStage, setCurrentStage] = useState(0)
  const [stages, setStages] = useState<GenerationStage[]>(
    GENERATION_STAGES.map(stage => ({
      ...stage,
      progress: 0,
      status: 'pending' as const,
    }))
  )
  const [overallProgress, setOverallProgress] = useState(0)

  const [formData, setFormData] = useState<TripFormData>({
    origin: '',
    destination: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    budget: 5000,
    travelers: 1,
    adult_count: 1,
    child_count: 0,
    preferences: [],
    hotel_preferences: [],
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

  const hotelPreferenceOptions = [
    '经济型',
    '中档舒适',
    '高档豪华',
    '度假村',
    '家庭友好',
    '商务酒店',
    '精品酒店',
    '民宿客栈',
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

  const toggleHotelPreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      hotel_preferences: (prev.hotel_preferences || []).includes(pref)
        ? (prev.hotel_preferences || []).filter(p => p !== pref)
        : [...(prev.hotel_preferences || []), pref],
    }))
  }

  // 模拟进度更新
  const simulateProgress = async (stageIndex: number, duration: number) => {
    const steps = 20 // 每个阶段20步
    const stepDuration = duration / steps

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))

      const progress = (i / steps) * 100

      setStages(prev => prev.map((stage, idx) => {
        if (idx === stageIndex) {
          return { ...stage, progress, status: 'in_progress' as const }
        }
        return stage
      }))

      // 更新总体进度
      const totalProgress = ((stageIndex + i / steps) / GENERATION_STAGES.length) * 100
      setOverallProgress(totalProgress)
    }

    // 标记当前阶段为完成
    setStages(prev => prev.map((stage, idx) => {
      if (idx === stageIndex) {
        return { ...stage, progress: 100, status: 'completed' as const }
      }
      return stage
    }))
  }

  // 处理智能语音填表
  const handleVoiceFillForm = (data: Partial<TripFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...data,
      // 确保数组类型字段正确合并
      preferences: data.preferences || prev.preferences,
      hotel_preferences: data.hotel_preferences || prev.hotel_preferences,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowProgress(true)

    // 重置进度状态
    setCurrentStage(0)
    setOverallProgress(0)
    setStages(GENERATION_STAGES.map(stage => ({
      ...stage,
      progress: 0,
      status: 'pending' as const,
    })))

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('请先登录')
        setShowProgress(false)
        router.push('/login')
        return
      }

      // 检查 DeepSeek Key 是否配置（必需）
      const deepseekCheck = await ApiKeyChecker.checkDeepSeekRequired(session.user.id, session.access_token)
      if (!deepseekCheck.available) {
        alert(deepseekCheck.message)
        setLoading(false)
        setShowProgress(false)
        router.push('/dashboard/settings')
        return
      }

      // 模拟各个阶段的进度（与API调用并行）
      const progressSimulation = (async () => {
        for (let i = 0; i < GENERATION_STAGES.length; i++) {
          setCurrentStage(i)
          // 每个阶段的持续时间（毫秒）
          const stageDuration = i === GENERATION_STAGES.length - 1 ? 3000 : 4000
          await simulateProgress(i, stageDuration)
        }
      })()

      // Call API to generate itinerary
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      // 等待进度模拟完成
      await progressSimulation

      if (response.ok) {
        const result = await response.json()
        const data = result.data

        // 标记所有阶段为完成
        setStages(prev => prev.map(stage => ({
          ...stage,
          progress: 100,
          status: 'completed' as const,
        })))
        setOverallProgress(100)

        // 短暂延迟后跳转，让用户看到完成状态
        await new Promise(resolve => setTimeout(resolve, 500))

        router.push(`/dashboard/trips/${data?.trip_id}`)
      } else {
        const error = await response.json()
        const errorMsg = error.details
          ? `${error.error}\n\n详细信息：${error.details}${error.hint ? `\n\n提示：${error.hint}` : ''}`
          : (error.error || '生成行程失败，请重试')
        alert(errorMsg)
        setShowProgress(false)
      }
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建新行程</h1>
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
                {/* Smart Voice Fill Form */}
                <SmartVoiceFillForm
                  onFillForm={handleVoiceFillForm}
                  className="mb-6"
                />

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      或手动填写表单
                    </span>
                  </div>
                </div>

                {/* Origin and Destination */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      出发地 <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">（可选）</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="例如: 上海、深圳、广州"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      />
                      <VoiceInput
                        onTranscript={(text) => setFormData({ ...formData, origin: text })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">目的地 *</label>
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
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">出发日期 *</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                    <div className="mt-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        到达时间（可选）
                      </label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={formData.start_time ? formData.start_time.split(':')[0] : ''}
                          onChange={(e) => {
                            const hour = e.target.value
                            if (!hour) {
                              setFormData({ ...formData, start_time: '' })
                            } else {
                              const minute = formData.start_time ? formData.start_time.split(':')[1] : '00'
                              setFormData({ ...formData, start_time: `${hour}:${minute}` })
                            }
                          }}
                          className="flex-1 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">--</option>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-sm">时</span>
                        <select
                          value={formData.start_time ? formData.start_time.split(':')[1] : ''}
                          onChange={(e) => {
                            const minute = e.target.value
                            const hour = formData.start_time ? formData.start_time.split(':')[0] : '00'
                            if (hour && minute) {
                              setFormData({ ...formData, start_time: `${hour}:${minute}` })
                            }
                          }}
                          disabled={!formData.start_time || !formData.start_time.split(':')[0]}
                          className="flex-1 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">--</option>
                          {[0, 15, 30, 45].map((i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-sm">分</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">返回日期 *</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                    <div className="mt-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        离开时间（可选）
                      </label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={formData.end_time ? formData.end_time.split(':')[0] : ''}
                          onChange={(e) => {
                            const hour = e.target.value
                            if (!hour) {
                              setFormData({ ...formData, end_time: '' })
                            } else {
                              const minute = formData.end_time ? formData.end_time.split(':')[1] : '00'
                              setFormData({ ...formData, end_time: `${hour}:${minute}` })
                            }
                          }}
                          className="flex-1 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">--</option>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-sm">时</span>
                        <select
                          value={formData.end_time ? formData.end_time.split(':')[1] : ''}
                          onChange={(e) => {
                            const minute = e.target.value
                            const hour = formData.end_time ? formData.end_time.split(':')[0] : '00'
                            if (hour && minute) {
                              setFormData({ ...formData, end_time: `${hour}:${minute}` })
                            }
                          }}
                          disabled={!formData.end_time || !formData.end_time.split(':')[0]}
                          className="flex-1 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">--</option>
                          {[0, 15, 30, 45].map((i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-sm">分</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">预算 (¥) *</label>
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
                    <label className="text-sm font-medium text-gray-900 dark:text-white">总人数 *</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">成人数</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.adult_count}
                      onChange={(e) => setFormData({ ...formData, adult_count: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">儿童数</label>
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
                  <label className="text-sm font-medium text-gray-900 dark:text-white">旅行偏好</label>
                  <div className="flex flex-wrap gap-2">
                    {preferenceOptions.map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => togglePreference(pref)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          formData.preferences.includes(pref)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotel Preferences */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    酒店偏好 <span className="text-xs text-gray-500 dark:text-gray-400">(可选)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {hotelPreferenceOptions.map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleHotelPreference(pref)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          (formData.hotel_preferences || []).includes(pref)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">补充说明</label>
                  <div className="space-y-2">
                    <textarea
                      className="flex min-h-[120px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent"
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

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgress}
        stages={stages}
        currentStage={currentStage}
        overallProgress={overallProgress}
      />
    </div>
  )
}
