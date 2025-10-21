'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  className?: string
}

export default function VoiceInput({ onTranscript, className = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        setIsSupported(true)
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'zh-CN'

        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            onTranscript(finalTranscript)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
        title="您的浏览器不支持语音输入"
      >
        <MicOff className="w-4 h-4 mr-2" />
        语音输入不可用
      </Button>
    )
  }

  return (
    <Button
      onClick={toggleListening}
      variant={isListening ? "destructive" : "outline"}
      className={className}
      title={isListening ? "点击停止录音" : "点击开始语音输入"}
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
