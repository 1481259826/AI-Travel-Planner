'use client'

import { useState, useRef } from 'react'
import { Mic, Loader2, Check, X, Edit2, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import VoiceInput from './VoiceInput'
import { supabase } from '@/lib/supabase'
import type { VoiceParseResult, TripFormData } from '@/types'

interface SmartVoiceFillFormProps {
  onFillForm: (data: Partial<TripFormData>) => void
  className?: string
}

export default function SmartVoiceFillForm({ onFillForm, className = '' }: SmartVoiceFillFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recognizedText, setRecognizedText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const voiceInputRef = useRef<any>(null)

  // 开始录音
  const handleStartRecording = () => {
    setIsRecording(true)
    setRecognizedText('')
    setParseResult(null)
    setError(null)
    setShowPreview(false)
  }

  // 接收语音识别结果
  const handleTranscript = (text: string) => {
    setRecognizedText(prev => prev + text)
  }

  // 停止录音并解析
  const handleStopRecording = async () => {
    setIsRecording(false)

    if (!recognizedText.trim()) {
      setError('未识别到语音内容，请重试')
      return
    }

    // 调用 AI 解析
    await parseVoiceInput(recognizedText)
  }

  // AI 解析语音文本
  const parseVoiceInput = async (text: string) => {
    setIsParsing(true)
    setError(null)

    try {
      // 获取当前用户的 session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('请先登录')
      }

      const response = await fetch('/api/voice/parse-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '解析失败')
      }

      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.message || '解析失败')
      }

      console.log('[SmartVoiceFillForm] AI 解析结果:', result.data)
      setParseResult(result.data)
      setShowPreview(true)
    } catch (err: any) {
      console.error('[SmartVoiceFillForm] 解析失败:', err)
      setError(err.message || '语音解析失败，请重试')
    } finally {
      setIsParsing(false)
    }
  }

  // 确认并填充表单
  const handleConfirmFill = () => {
    if (!parseResult) return

    const formData: Partial<TripFormData> = {}

    if (parseResult.destination) formData.destination = parseResult.destination
    if (parseResult.origin) formData.origin = parseResult.origin
    if (parseResult.start_date) formData.start_date = parseResult.start_date
    if (parseResult.end_date) formData.end_date = parseResult.end_date
    if (parseResult.budget) formData.budget = parseResult.budget
    if (parseResult.travelers) formData.travelers = parseResult.travelers
    if (parseResult.adult_count) formData.adult_count = parseResult.adult_count
    if (parseResult.child_count) formData.child_count = parseResult.child_count
    if (parseResult.preferences) formData.preferences = parseResult.preferences
    if (parseResult.hotel_preferences) formData.hotel_preferences = parseResult.hotel_preferences
    if (parseResult.additional_notes) formData.additional_notes = parseResult.additional_notes

    console.log('[SmartVoiceFillForm] 即将填充表单:', formData)
    onFillForm(formData)

    // 重置状态
    handleReset()
    setIsOpen(false)
  }

  // 重新录音
  const handleReset = () => {
    setRecognizedText('')
    setParseResult(null)
    setError(null)
    setShowPreview(false)
    setIsRecording(false)
  }

  // 渲染字段预览
  const renderFieldPreview = () => {
    if (!parseResult) return null

    const fields = [
      { label: '目的地', value: parseResult.destination, required: true },
      { label: '出发地', value: parseResult.origin },
      { label: '出发日期', value: parseResult.start_date },
      { label: '返回日期', value: parseResult.end_date },
      { label: '预算', value: parseResult.budget ? `¥${parseResult.budget}` : null },
      { label: '人数', value: parseResult.travelers },
      { label: '成人', value: parseResult.adult_count },
      { label: '儿童', value: parseResult.child_count },
      { label: '旅行偏好', value: parseResult.preferences?.join('、') },
      { label: '酒店偏好', value: parseResult.hotel_preferences?.join('、') },
      { label: '补充说明', value: parseResult.additional_notes },
    ]

    return (
      <div className="space-y-2">
        {fields.map((field, index) => {
          if (!field.value) return null

          return (
            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}:
                </span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {field.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className={className}>
        <Button
          onClick={() => setIsOpen(true)}
          variant="default"
          size="lg"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          智能语音填表
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          一次性说出所有旅行信息，AI 自动填充表单
        </p>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* 标题和关闭按钮 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">智能语音填表</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              handleReset()
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 使用说明 */}
        {!recognizedText && !isParsing && !showPreview && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm">
              <p className="font-medium mb-1">🎤 使用方法：</p>
              <p className="text-gray-600 dark:text-gray-400">
                点击下方麦克风按钮，一次性说出您的旅行计划。例如：
              </p>
              <p className="text-gray-700 dark:text-gray-300 italic mt-1">
                "我想去日本东京，5天，预算1万元，喜欢美食和动漫，带孩子"
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <AlertDescription className="text-sm text-red-700 dark:text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 识别的文本 */}
        {recognizedText && !showPreview && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">识别结果:</p>
            <p className="text-sm text-gray-900 dark:text-white">{recognizedText}</p>
          </div>
        )}

        {/* 录音控制 */}
        {!showPreview && !isParsing && (
          <div className="flex flex-col items-center gap-3">
            <VoiceInput
              onTranscript={handleTranscript}
              className="w-full"
            />

            {recognizedText && (
              <div className="flex gap-2 w-full">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  重新录音
                </Button>
                <Button
                  onClick={() => parseVoiceInput(recognizedText)}
                  variant="default"
                  className="flex-1"
                  disabled={isParsing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 解析
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 解析中 */}
        {isParsing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI 正在解析您的旅行需求...
            </p>
          </div>
        )}

        {/* 解析结果预览 */}
        {showPreview && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">解析完成！</span>
            </div>

            {/* 原始语音文本 */}
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">您说的是:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{recognizedText}</p>
            </div>

            {/* 字段映射预览 */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                识别到的信息:
              </p>
              {renderFieldPreview()}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                重新录音
              </Button>
              <Button
                onClick={handleConfirmFill}
                variant="default"
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <Check className="w-4 h-4 mr-2" />
                填充表单
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
