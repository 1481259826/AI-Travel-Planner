/**
 * ChatSidebar 组件
 * 会话列表侧边栏
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Plus,
  MessageSquare,
  Trash2,
  MapPin,
  MoreVertical,
  X,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatSessionListItem } from '@/lib/chat'

// ============================================================================
// 类型定义
// ============================================================================

interface ChatSidebarProps {
  /** 会话列表 */
  sessions: ChatSessionListItem[]
  /** 当前会话 ID */
  currentSessionId?: string | null
  /** 是否正在加载 */
  isLoading?: boolean
  /** 是否展开（移动端） */
  isOpen?: boolean
  /** 选择会话 */
  onSelectSession: (sessionId: string) => void
  /** 创建新会话 */
  onNewSession: () => void
  /** 删除会话 */
  onDeleteSession: (sessionId: string) => void
  /** 关闭侧边栏（移动端） */
  onClose?: () => void
}

// ============================================================================
// 会话列表项组件
// ============================================================================

interface SessionItemProps {
  session: ChatSessionListItem
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
      setShowMenu(false)
    }
  }

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* 图标 */}
      <MessageSquare className="w-4 h-4 flex-shrink-0" />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 标题 */}
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium truncate">
            {session.title || '新对话'}
          </p>
          {session.tripDestination && (
            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              {session.tripDestination}
            </span>
          )}
        </div>

        {/* 最后消息 */}
        {session.lastMessage && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {session.lastMessage}
          </p>
        )}

        {/* 时间 */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {format(new Date(session.updatedAt), 'MM/dd HH:mm', { locale: zhCN })}
        </p>
      </div>

      {/* 更多操作 */}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            showMenu ? 'opacity-100' : ''
          } hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* 下拉菜单 */}
        {showMenu && (
          <>
            {/* 遮罩 */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
              }}
            />
            {/* 菜单 */}
            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 主组件实现
// ============================================================================

export function ChatSidebar({
  sessions,
  currentSessionId,
  isLoading = false,
  isOpen = true,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose,
}: ChatSidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-72 bg-white dark:bg-gray-900 border-r dark:border-gray-700
          flex flex-col
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            对话历史
          </h2>
          <div className="flex items-center gap-2">
            {/* 新建按钮 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onNewSession}
              title="新建对话"
            >
              <Plus className="w-4 h-4" />
            </Button>
            {/* 关闭按钮（移动端） */}
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                暂无对话记录
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={onNewSession}
              >
                <Plus className="w-4 h-4 mr-1" />
                开始新对话
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t dark:border-gray-700">
          <Button
            className="w-full"
            onClick={onNewSession}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建对话
          </Button>
        </div>
      </aside>
    </>
  )
}

export default ChatSidebar
