/**
 * MessageList 组件
 * 消息列表展示，包括用户消息和 AI 回复
 * 支持对话式行程生成的表单预览和进度卡片
 */

'use client'

import { useRef, useEffect } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolCallCard } from './ToolCallCard'
import TripFormCard from './TripFormCard'
import TripGenerationProgress from './TripGenerationProgress'
import TripCompletionCard from './TripCompletionCard'
import ModificationPreviewCard from './ModificationPreviewCard'
import type {
  ChatMessage,
  ToolCall,
  TripFormData,
  TripFormValidation,
  GenerationStage,
  ModificationPreview,
} from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 流式生成中的内容 */
  streamingContent?: string
  /** 是否正在生成 */
  isGenerating?: boolean
  /** 当前工具调用 */
  currentToolCall?: ToolCall | null
  /** 是否正在加载 */
  isLoading?: boolean
  // 行程生成相关
  /** 待确认的表单数据 */
  pendingForm?: Partial<TripFormData> | null
  /** 表单验证状态 */
  formValidation?: TripFormValidation | null
  /** 是否正在生成行程 */
  isTripGenerating?: boolean
  /** 生成进度 */
  generationProgress?: number
  /** 生成阶段 */
  generationStages?: GenerationStage[]
  /** 当前生成阶段 */
  currentGenerationStage?: number
  /** 生成错误 */
  generationError?: string | null
  /** 生成结果 */
  generationResult?: { tripId: string; destination?: string } | null
  /** 表单编辑回调 */
  onFormEdit?: () => void
  /** 表单确认回调 */
  onFormConfirm?: () => void
  /** 表单取消回调 */
  onFormCancel?: () => void
  /** 取消生成回调 */
  onCancelGeneration?: () => void
  // 行程修改预览相关
  /** 待确认的修改预览 */
  pendingModification?: ModificationPreview | null
  /** 修改预览确认回调 */
  onModificationConfirm?: (modificationId: string) => void
  /** 修改预览取消回调 */
  onModificationCancel?: (modificationId: string) => void
  /** 是否正在处理修改 */
  isModificationProcessing?: boolean
}

// ============================================================================
// 单条消息组件
// ============================================================================

interface MessageItemProps {
  message: ChatMessage
  isStreaming?: boolean
}

function MessageItem({ message, isStreaming = false }: MessageItemProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 解析工具调用
  const toolCalls = message.metadata?.toolCalls || []

  return (
    <div
      className={`flex gap-3 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI 头像 */}
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      {/* 消息内容 */}
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm px-4 py-3'
        }`}
      >
        {/* 文本内容 */}
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 自定义代码块样式
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match
                  return isInline ? (
                    <code
                      className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  )
                },
                // 自定义链接样式
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    {...props}
                  >
                    {children}
                  </a>
                ),
                // 自定义列表样式
                ul: ({ children, ...props }) => (
                  <ul className="list-disc list-inside space-y-1" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="list-decimal list-inside space-y-1" {...props}>
                    {children}
                  </ol>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* 工具调用展示 */}
        {toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {toolCalls.map((tc: ToolCall) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <div
          className={`text-xs mt-1 ${
            isUser
              ? 'text-blue-200'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {format(new Date(message.timestamp), 'HH:mm')}
        </div>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 流式消息组件
// ============================================================================

interface StreamingMessageProps {
  content: string
  toolCall?: ToolCall | null
}

function StreamingMessage({ content, toolCall }: StreamingMessageProps) {
  return (
    <div className="flex gap-3 py-4 justify-start">
      {/* AI 头像 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>

      {/* 消息内容 */}
      <div className="max-w-[80%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm px-4 py-3">
        {/* 工具调用 */}
        {toolCall && (
          <div className="mb-2">
            <ToolCallCard toolCall={toolCall} isExecuting />
          </div>
        )}

        {/* 流式文本 */}
        {content && (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* 没有内容时显示加载动画 */}
        {!content && !toolCall && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">思考中...</span>
          </div>
        )}

        {/* 闪烁光标 */}
        {content && (
          <span className="inline-block w-2 h-4 bg-gray-400 dark:bg-gray-500 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 主组件实现
// ============================================================================

export function MessageList({
  messages,
  streamingContent = '',
  isGenerating = false,
  currentToolCall = null,
  isLoading = false,
  // 行程生成相关
  pendingForm = null,
  formValidation = null,
  isTripGenerating = false,
  generationProgress = 0,
  generationStages = [],
  currentGenerationStage = 0,
  generationError = null,
  generationResult = null,
  onFormEdit,
  onFormConfirm,
  onFormCancel,
  onCancelGeneration,
  // 行程修改预览相关
  pendingModification = null,
  onModificationConfirm,
  onModificationCancel,
  isModificationProcessing = false,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // 计算天数（用于进度卡片）
  const calculateDays = (startDate?: string, endDate?: string): number => {
    if (!startDate || !endDate) return 0
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    } catch {
      return 0
    }
  }

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, streamingContent, pendingForm, isTripGenerating, generationResult, pendingModification])

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">加载消息历史...</p>
        </div>
      </div>
    )
  }

  // 空状态
  if (messages.length === 0 && !isGenerating && !pendingForm && !isTripGenerating && !pendingModification) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            你好，我是旅行小助手
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            我可以帮你规划旅行行程、搜索景点酒店、回答旅行问题。有什么可以帮你的？
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              '帮我规划杭州3日游',
              '推荐北京的美食',
              '查询上海明天天气',
              '西湖附近有什么景点',
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* 历史消息 */}
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* 流式生成中的消息 */}
        {isGenerating && (
          <StreamingMessage
            content={streamingContent}
            toolCall={currentToolCall}
          />
        )}

        {/* 表单预览卡片 */}
        {pendingForm && formValidation && !isTripGenerating && !generationResult && (
          <div className="flex gap-3 py-4 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <TripFormCard
              formData={pendingForm}
              validation={formValidation}
              onEdit={onFormEdit || (() => {})}
              onConfirm={onFormConfirm || (() => {})}
              onCancel={onFormCancel || (() => {})}
              isGenerating={isTripGenerating}
            />
          </div>
        )}

        {/* 生成进度卡片 */}
        {isTripGenerating && generationStages.length > 0 && (
          <div className="flex gap-3 py-4 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <TripGenerationProgress
              destination={pendingForm?.destination || ''}
              days={calculateDays(pendingForm?.startDate, pendingForm?.endDate)}
              stages={generationStages}
              currentStage={currentGenerationStage}
              progress={generationProgress}
              error={generationError}
              onCancel={onCancelGeneration}
            />
          </div>
        )}

        {/* 生成完成卡片 */}
        {generationResult && !isTripGenerating && (
          <div className="flex gap-3 py-4 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <TripCompletionCard
              tripId={generationResult.tripId}
              destination={generationResult.destination || pendingForm?.destination || ''}
              startDate={pendingForm?.startDate || ''}
              endDate={pendingForm?.endDate || ''}
              totalDays={calculateDays(pendingForm?.startDate, pendingForm?.endDate)}
            />
          </div>
        )}

        {/* 行程修改预览卡片 */}
        {pendingModification && pendingModification.status === 'pending' && (
          <div className="flex gap-3 py-4 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-[90%]">
              <ModificationPreviewCard
                preview={pendingModification}
                onConfirm={onModificationConfirm || (() => {})}
                onCancel={onModificationCancel || (() => {})}
                isProcessing={isModificationProcessing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageList
