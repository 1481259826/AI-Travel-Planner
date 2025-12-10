/**
 * TripChatPanel 组件
 * 行程详情页的对话侧边栏
 * 支持滑出式面板、关联当前行程上下文、实时修改
 */

'use client'

import { useEffect, useCallback } from 'react'
import { X, MessageCircle, Sparkles } from 'lucide-react'
import { useChatAgent } from '@/hooks/useChatAgent'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { ModificationPreview } from '@/lib/chat'
import type { UserAdjustments } from '@/hooks/useChatAgent'

// ============================================================================
// 类型定义
// ============================================================================

interface TripChatPanelProps {
  /** 行程 ID */
  tripId: string
  /** 行程目的地（用于上下文提示） */
  destination?: string
  /** 是否打开 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 修改确认成功回调（用于刷新行程数据） */
  onModificationConfirmed?: (modificationId: string, affectedDays: number[]) => void
}

// ============================================================================
// 组件实现
// ============================================================================

export function TripChatPanel({
  tripId,
  destination,
  isOpen,
  onClose,
  onModificationConfirmed,
}: TripChatPanelProps) {
  // 使用对话 hook，关联行程 ID
  const {
    messages,
    isLoading,
    isGenerating,
    error,
    currentToolCall,
    streamingContent,
    sendMessage,
    reset,
    // 行程修改预览相关
    pendingModification,
    isModificationProcessing,
    lastConfirmedModification,
    confirmModification,
    cancelModification,
    clearLastConfirmedModification,
  } = useChatAgent({
    tripId,
    autoLoadHistory: false, // 侧边栏模式不自动加载历史
  })

  // 监听修改确认成功
  useEffect(() => {
    if (lastConfirmedModification) {
      // 触发回调，通知页面刷新和滚动
      onModificationConfirmed?.(
        lastConfirmedModification.modificationId,
        lastConfirmedModification.affectedDays
      )
      // 清除状态，避免重复触发
      clearLastConfirmedModification()
    }
  }, [lastConfirmedModification, onModificationConfirmed, clearLastConfirmedModification])

  // 处理确认修改
  const handleModificationConfirm = useCallback(
    (modificationId: string, userAdjustments?: UserAdjustments) => {
      confirmModification(modificationId, userAdjustments)
    },
    [confirmModification]
  )

  // 处理取消修改
  const handleModificationCancel = useCallback(
    (modificationId: string) => {
      cancelModification(modificationId)
    },
    [cancelModification]
  )

  // 处理关闭面板
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // 处理发送消息
  const handleSendMessage = useCallback(
    async (content: string) => {
      await sendMessage(content)
    },
    [sendMessage]
  )

  // 点击遮罩层关闭
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose]
  )

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // 阻止滚动穿透
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* 侧边栏面板 */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[440px] md:w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI 行程助手
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {destination ? `正在编辑：${destination} 之旅` : '智能修改行程'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 功能提示 */}
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            你可以说：&quot;删除第二天的西湖&quot;、&quot;把灵隐寺移到上午&quot;、&quot;帮我优化路线&quot; 等
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 消息列表区域 - MessageList 内部自带滚动 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isGenerating={isGenerating}
            currentToolCall={currentToolCall}
            isLoading={isLoading}
            // 行程修改预览相关
            pendingModification={pendingModification}
            onModificationConfirm={handleModificationConfirm}
            onModificationCancel={handleModificationCancel}
            isModificationProcessing={isModificationProcessing}
          />
        </div>

        {/* 输入框 */}
        <ChatInput
          isGenerating={isGenerating}
          disabled={isLoading}
          placeholder="描述你想要的修改..."
          onSend={handleSendMessage}
        />
      </div>
    </>
  )
}

export default TripChatPanel
