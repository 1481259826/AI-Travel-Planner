/**
 * 对话页面
 * /dashboard/chat
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plane,
  Menu,
  ArrowLeft,
  Settings,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatSidebar, ChatInput, MessageList } from '@/components/chat'
import { useChatAgent, useChatSessions } from '@/hooks/useChatAgent'
import { auth } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 会话列表
  const {
    sessions,
    isLoading: sessionsLoading,
    refresh: refreshSessions,
    deleteSession,
  } = useChatSessions()

  // 对话状态
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
  } = useChatAgent()

  // 认证检查
  useEffect(() => {
    checkAuth()
  }, [])

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
          />

          {/* 输入框 */}
          <ChatInput
            isGenerating={isGenerating}
            onSend={handleSendMessage}
          />
        </main>
      </div>
    </div>
  )
}
