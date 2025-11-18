'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { XFYunVoiceClient, AudioProcessor } from '@/lib/xfyun-voice'
import type { VoiceMode } from '@/types'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  className?: string
  mode?: VoiceMode // 'web' | 'xfyun' | undefined (自动检测)
}

export default function VoiceInput({ onTranscript, className = '', mode }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [currentMode, setCurrentMode] = useState<VoiceMode>('web')
  const [isCheckingXFYun, setIsCheckingXFYun] = useState(false)
  const recognitionRef = useRef<any>(null)
  const xfyunClientRef = useRef<XFYunVoiceClient | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const transcriptBufferRef = useRef<string>('')

  // 初始化：检测可用模式
  useEffect(() => {
    const initVoiceMode = async () => {
      if (typeof window === 'undefined') return

      // 如果用户指定了模式，直接使用
      if (mode) {
        setCurrentMode(mode)
        if (mode === 'web') {
          initWebSpeech()
        }
        return
      }

      // 自动检测模式：优先尝试科大讯飞
      setIsCheckingXFYun(true)
      try {
        // 获取认证令牌
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/voice/transcribe', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data?.authUrl) {
              setCurrentMode('xfyun')
              setIsSupported(true)
              setIsCheckingXFYun(false)
              return
            }
          }
        }
      } catch (error) {
        // 科大讯飞不可用，静默回退到 Web Speech API
      }
      setIsCheckingXFYun(false)

      // 回退到 Web Speech API
      setCurrentMode('web')
      initWebSpeech()
    }

    initVoiceMode()

    return () => {
      cleanup()
    }
  }, [mode])

  // 初始化 Web Speech API
  const initWebSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('[VoiceInput] Web Speech error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }

  // 清理资源
  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (xfyunClientRef.current) {
      xfyunClientRef.current.close()
      xfyunClientRef.current = null
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.close()
      audioProcessorRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }

  // 开始/停止录音
  const toggleListening = async () => {
    if (isListening) {
      stopListening()
    } else {
      await startListening()
    }
  }

  // 开始录音
  const startListening = async () => {
    if (currentMode === 'web') {
      startWebSpeech()
    } else if (currentMode === 'xfyun') {
      await startXFYun()
    }
  }

  // 停止录音
  const stopListening = () => {
    if (currentMode === 'web') {
      stopWebSpeech()
    } else if (currentMode === 'xfyun') {
      stopXFYun()
    }
  }

  // Web Speech API 录音
  const startWebSpeech = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.error('[VoiceInput] 启动 Web Speech 失败:', error)
    }
  }

  const stopWebSpeech = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // 科大讯飞录音
  const startXFYun = async () => {
    try {
      // 获取认证令牌
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('请先登录')
      }

      // 获取鉴权参数
      const response = await fetch('/api/voice/transcribe', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) {
        throw new Error('获取语音识别鉴权失败')
      }

      const result = await response.json()
      const { authUrl, appId } = result.data

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // 初始化科大讯飞客户端（直接使用后端生成的 authUrl）
      const client = new XFYunVoiceClient({
        appId,
        apiKey: '', // 不需要，因为使用预生成的 authUrl
        authUrl
      })
      xfyunClientRef.current = client

      // 连接并开始识别
      transcriptBufferRef.current = ''

      await client.connect(
        (result) => {
          transcriptBufferRef.current += result.text

          if (result.isFinal) {
            // 最终结果，触发回调
            onTranscript(transcriptBufferRef.current)
            transcriptBufferRef.current = ''
          }
        },
        (error) => {
          console.error('[VoiceInput] 科大讯飞错误:', error)
          stopXFYun()
        }
      )

      // 初始化音频处理器
      const processor = new AudioProcessor()
      audioProcessorRef.current = processor

      processor.startProcessing(stream, (audioData) => {
        client.sendAudio(audioData)
      })

      setIsListening(true)
    } catch (error: any) {
      console.error('[VoiceInput] 启动科大讯飞失败:', error)
      alert(`语音识别启动失败: ${error.message}`)
      cleanup()
    }
  }

  const stopXFYun = () => {
    if (xfyunClientRef.current) {
      xfyunClientRef.current.stop()

      // 延迟关闭，等待最终结果
      setTimeout(() => {
        xfyunClientRef.current?.close()
        xfyunClientRef.current = null
      }, 500)
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopProcessing()
      audioProcessorRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // 如果有缓冲的文本，也返回
    if (transcriptBufferRef.current) {
      onTranscript(transcriptBufferRef.current)
      transcriptBufferRef.current = ''
    }

    setIsListening(false)
  }

  // 检查中
  if (isCheckingXFYun) {
    return (
      <Button
        variant="outline"
        disabled
        className={`whitespace-nowrap ${className}`}
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        检测中...
      </Button>
    )
  }

  // 不支持
  if (!isSupported && currentMode === 'web') {
    return (
      <Button
        variant="outline"
        disabled
        className={`whitespace-nowrap ${className}`}
        title="您的浏览器不支持语音输入。建议使用 Chrome/Edge/Safari 浏览器，或在设置页面添加科大讯飞语音 API Key 以获得更好的语音识别效果。"
      >
        <MicOff className="w-4 h-4 mr-2" />
        语音不可用
      </Button>
    )
  }

  const modeLabel = currentMode === 'xfyun' ? '(科大讯飞)' : '(浏览器)'
  const buttonTitle = isListening
    ? "点击停止录音"
    : `点击开始语音输入 ${modeLabel}`

  return (
    <Button
      onClick={toggleListening}
      variant={isListening ? "destructive" : "outline"}
      className={`whitespace-nowrap ${className}`}
      title={buttonTitle}
    >
      {isListening ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          正在录音...
        </>
      ) : (
        <>
          <Mic className="w-4 h-4 mr-2" />
          语音输入
        </>
      )}
    </Button>
  )
}
