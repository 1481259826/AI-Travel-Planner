/**
 * 对话页面
 * /dashboard/chat
 * 支持 ?tripId=xxx 参数关联行程
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plane,
  Menu,
  ArrowLeft,
  Settings,
  MessageCircle,
  MapPin,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatSidebar, ChatInput, MessageList, TripFormModal } from '@/components/chat'
import { useChatAgent, useChatSessions } from '@/hooks/useChatAgent'
import type { TripFormData } from '@/lib/chat'
import { auth, supabase } from '@/lib/database'
import type { Trip } from '@/types'

/**
 * 聊天页面内部组件
 * 使用 useSearchParams 需要包装在 Suspense 中
 */
function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripIdFromUrl = searchParams.get('tripId')

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 关联的行程信息
  const [linkedTrip, setLinkedTrip] = useState<Trip | null>(null)
  const [_loadingTrip, setLoadingTrip] = useState(false)

  // 会话列表
  const {
    sessions,
    isLoading: sessionsLoading,
    refresh: refreshSessions,
    deleteSession,
  } = useChatSessions()

  // 对话状态 - 传入关联的行程 ID
  const {
    messages,
    isLoading,
    isGenerating,
    error,
    sessionId,
    currentToolCall,
    streamingContent,
    sendMessage,
    switchSession,
    createNewSession,
    // 行程生成相关
    tripGenerationState,
    openFormModal,
    closeFormModal,
    updatePendingForm,
    startTripGeneration,
    cancelTripGeneration,
    resetTripGeneration,
  } = useChatAgent({ tripId: tripIdFromUrl || undefined })

  // 认证检查
  useEffect(() => {
    checkAuth()
  }, [])

  // 加载关联的行程信息
  useEffect(() => {
    if (tripIdFromUrl && user) {
      loadLinkedTrip(tripIdFromUrl)
    } else {
      setLinkedTrip(null)
    }
  }, [tripIdFromUrl, user])

  /**
   * 加载关联的行程
   */
  const loadLinkedTrip = async (tripId: string) => {
    setLoadingTrip(true)
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, destination, start_date, end_date, budget, travelers')
        .eq('id', tripId)
        .single()

      if (error) {
        console.error('加载行程失败:', error)
        return
      }

      setLinkedTrip(data as Trip)
    } catch (err) {
      console.error('加载行程失败:', err)
    } finally {
      setLoadingTrip(false)
    }
  }

  /**
   * 取消关联行程
   */
  const clearLinkedTrip = () => {
    setLinkedTrip(null)
    // 从 URL 中移除 tripId 参数
    router.replace('/dashboard/chat')
  }

  const checkAuth = async () => {
    try {
      const { data: { session } } = await auth.getSession()

      if (session?.user) {
        setUser(session.user)
        setAuthLoading(false)

        // 后台验证
        auth.getUser().then(({ user, error }) => {
          if (error || !user) {
            router.push('/login')
          }
        })
        return
      }

      const { user, error } = await auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  /**
   * 处理发送消息
   */
  const handleSendMessage = async (content: string) => {
    await sendMessage(content)
    // 刷新会话列表
    refreshSessions()
  }

  /**
   * 处理选择会话
   */
  const handleSelectSession = (id: string) => {
    switchSession(id)
    setSidebarOpen(false)
  }

  /**
   * 处理新建会话
   */
  const handleNewSession = () => {
    createNewSession()
    setSidebarOpen(false)
  }

  /**
   * 处理删除会话
   */
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id)
    if (sessionId === id) {
      createNewSession()
    }
  }

  // 加载状态
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Plane className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-bounce mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">验证登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* 左侧 */}
          <div className="flex items-center gap-3">
            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* 返回按钮 */}
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                旅行助手
              </h1>
            </div>
          </div>

          {/* 右侧 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {user?.email}
            </span>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 行程关联提示条 */}
        {linkedTrip && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">
                  正在为
                  <Link
                    href={`/dashboard/trips/${linkedTrip.id}`}
                    className="font-medium hover:underline mx-1"
                  >
                    {linkedTrip.destination}之旅
                  </Link>
                  提供帮助
                </span>
                <span className="text-blue-500 dark:text-blue-400 text-xs">
                  ({linkedTrip.start_date} 至 {linkedTrip.end_date})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLinkedTrip}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 h-6 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <ChatSidebar
          sessions={sessions}
          currentSessionId={sessionId}
          isLoading={sessionsLoading}
          isOpen={sidebarOpen}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onClose={() => setSidebarOpen(false)}
        />

        {/* 主聊天区 */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* 错误提示 */}
          {error && (
            <div className="flex-shrink-0 mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 消息列表 */}
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isGenerating={isGenerating}
            currentToolCall={currentToolCall}
            isLoading={isLoading}
            // 行程生成相关
            pendingForm={tripGenerationState.pendingForm}
            formValidation={tripGenerationState.formValidation}
            isTripGenerating={tripGenerationState.generation.isGenerating}
            generationProgress={tripGenerationState.generation.progress}
            generationStages={tripGenerationState.generation.stages}
            currentGenerationStage={tripGenerationState.generation.currentStage}
            generationError={tripGenerationState.generation.error}
            generationResult={tripGenerationState.generation.result}
            onFormEdit={openFormModal}
            onFormConfirm={() => {
              if (tripGenerationState.pendingForm && tripGenerationState.formValidation?.isValid) {
                startTripGeneration(tripGenerationState.pendingForm as TripFormData)
              }
            }}
            onFormCancel={resetTripGeneration}
            onCancelGeneration={cancelTripGeneration}
          />

          {/* 输入框 */}
          <ChatInput
            isGenerating={isGenerating}
            onSend={handleSendMessage}
          />

          {/* 表单编辑模态框 */}
          <TripFormModal
            isOpen={tripGenerationState.isModalOpen}
            formData={tripGenerationState.pendingForm || {}}
            onClose={closeFormModal}
            onSubmit={(formData) => {
              startTripGeneration(formData as TripFormData)
            }}
          />
        </main>
      </div>
    </div>
  )
}

/**
 * 加载状态组件
 */
function ChatPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Plane className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-bounce mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    </div>
  )
}

/**
 * 对话页面
 * 包装 Suspense 以支持 useSearchParams
 */
export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageLoading />}>
      <ChatPageContent />
    </Suspense>
  )
}
