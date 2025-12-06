/**
 * ChatInput 组件
 * 对话输入框，支持多行输入和快捷键发送
 */

'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Loader2, StopCircle, Mic, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// 类型定义
// ============================================================================

interface ChatInputProps {
  /** 是否正在生成回复 */
  isGenerating?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 发送消息回调 */
  onSend: (message: string) => void
  /** 停止生成回调 */
  onStop?: () => void
}

// ============================================================================
// 组件实现
// ============================================================================

export function ChatInput({
  isGenerating = false,
  disabled = false,
  placeholder = '输入消息，按 Enter 发送，Shift+Enter 换行...',
  onSend,
  onStop,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 自动调整高度
   */
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  /**
   * 处理输入变化
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    adjustHeight()
  }

  /**
   * 处理发送
   */
  const handleSend = () => {
    if (!message.trim() || isGenerating || disabled) return

    onSend(message.trim())
    setMessage('')

    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送（非 Shift）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * 处理停止
   */
  const handleStop = () => {
    onStop?.()
  }

  const canSend = message.trim().length > 0 && !isGenerating && !disabled

  return (
    <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          {/* 附件按钮（占位，暂不实现） */}
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="添加附件（开发中）"
            disabled
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[24px] max-h-[200px] py-1"
            style={{ scrollbarWidth: 'thin' }}
          />

          {/* 语音按钮（占位，暂不实现） */}
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="语音输入（开发中）"
            disabled
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* 发送/停止按钮 */}
          {isGenerating ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleStop}
              className="rounded-full w-10 h-10 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
              title="停止生成"
            >
              <StopCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full w-10 h-10"
              title="发送消息"
            >
              {disabled ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>

        {/* 提示文本 */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
          按 Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  )
}

export default ChatInput
