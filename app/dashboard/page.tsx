'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plane, Plus, MapPin, Calendar, DollarSign, LogOut, Trash2, Database, Cloud, Settings, Bug, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { auth, db } from '@/lib/database'
import { Trip } from '@/types'
import { format } from 'date-fns'
import { useOfflineTrips } from '@/hooks/useOfflineTrips'
import { useServerStatus } from '@/hooks/useServerStatus'
import { offlineData } from '@/lib/offline'
import CacheManager from '@/components/CacheManager'
import ApiKeySetupModal from '@/components/ApiKeySetupModal'
import { useApiKeyCheck } from '@/hooks/useApiKeyCheck'
import { appConfig } from '@/lib/config/app.config'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCacheManager, setShowCacheManager] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false)

  // Check if server is actually reachable
  const { isServerOnline } = useServerStatus()

  // Use offline-first hook for trips
  const { trips, isLoading: tripsLoading, error, refetch, fromCache } = useOfflineTrips(user?.id || null)

  // Check API Keys configuration
  const { isChecking, missingRequired, missingOptional, hasChecked } = useApiKeyCheck()

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [])

  // 当 API Key 检查完成后，决定是否显示配置弹窗
  useEffect(() => {
    if (!hasChecked || authLoading) return

    // 检查是否已经跳过配置
    const hasSkipped = localStorage.getItem('apiKeySetupSkipped') === 'true'

    // 如果有必需的配置缺失，始终弹出（不管是否跳过）
    if (missingRequired.length > 0) {
      setShowApiKeySetup(true)
    } else if (!hasSkipped && missingOptional.length > 0) {
      // 如果只有可选配置缺失，且用户未跳过，则弹出
      setShowApiKeySetup(true)
    }
  }, [hasChecked, missingRequired, missingOptional, authLoading])

  const checkAuth = async () => {
    try {
      // Always check local session first (fast - reads from localStorage)
      const { data: { session } } = await auth.getSession()

      if (session?.user) {
        // Immediately set user from cached session
        setUser(session.user)
        setAuthLoading(false)

        // Then verify with server in background if online (non-blocking)
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
        if (isOnline) {
          auth.getUser().then(({ user, error }) => {
            if (error || !user) {
              // Session expired, redirect to login
              router.push('/login')
            }
          }).catch(err => {
            console.error('Background auth verification failed:', err)
            // Keep using cached session if verification fails
          })
        }
        return
      }

      // No cached session - need to check with server
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

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/')
  }

  const handleDelete = async (e: React.MouseEvent, tripId: string, tripName: string) => {
    e.preventDefault() // 阻止链接跳转
    e.stopPropagation()

    if (!confirm(`确定要删除行程"${tripName}"吗？此操作无法撤销。`)) {
      return
    }

    setDeletingId(tripId)
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      // Delete from server and cache
      if (isOnline) {
        const { error } = await db.trips.delete(tripId)
        if (error) throw error
      }

      // Delete from offline cache
      await offlineData.deleteTrip(tripId, !isOnline)

      // Refresh the list
      await refetch()
      alert('行程已删除')
    } catch (error) {
      console.error('Error deleting trip:', error)
      alert('删除行程失败')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      planned: '已计划',
      ongoing: '进行中',
      completed: '已完成',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      planned: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-700'
  }

  // 显示加载状态：只在认证加载时显示加载页面，行程加载时显示骨架屏
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 旅行规划师</h1>
          </div>
          <div className="flex items-center gap-4">
            {mounted && fromCache && (
              <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                <Database className="w-4 h-4" />
                <span>离线数据</span>
              </div>
            )}
            {mounted && !fromCache && typeof navigator !== 'undefined' && navigator.onLine && (
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Cloud className="w-4 h-4" />
                <span>已同步</span>
              </div>
            )}
            <span className="text-gray-700 dark:text-gray-300">欢迎, {user?.email}</span>
            <Button
              variant="outline"
              onClick={() => setShowCacheManager(!showCacheManager)}
            >
              <Database className="w-4 h-4 mr-2" />
              缓存
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Button>
            </Link>
            {/* 对话助手入口 - 根据 Feature Flag 控制显示 */}
            {appConfig.features.useChatAgent && (
              <Link href="/dashboard/chat">
                <Button variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  对话助手
                </Button>
              </Link>
            )}
            {/* 调试入口 - 仅开发环境显示 */}
            {process.env.NODE_ENV === 'development' && (
              <Link href="/dashboard/debug">
                <Button variant="outline" size="sm" className="text-purple-600 border-purple-300 hover:bg-purple-50">
                  <Bug className="w-4 h-4 mr-1" />
                  调试
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Cache Manager */}
        {showCacheManager && (
          <div className="mb-6">
            <CacheManager />
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">我的行程</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">管理您的旅行计划</p>
          </div>
          {isServerOnline ? (
            <Link href="/dashboard/create">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                创建新行程
              </Button>
            </Link>
          ) : (
            <Button size="lg" disabled title="离线时无法创建新行程">
              <Plus className="w-5 h-5 mr-2" />
              创建新行程（离线）
            </Button>
          )}
        </div>

        {/* Trips Grid */}
        {tripsLoading ? (
          <div className="text-center py-16">
            <Plane className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-bounce mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">加载行程数据...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              还没有旅行计划
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              创建您的第一个行程，开始规划精彩旅程
            </p>
            {isServerOnline ? (
              <Link href="/dashboard/create">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  创建行程
                </Button>
              </Link>
            ) : (
              <Button disabled title="离线时无法创建新行程">
                <Plus className="w-5 h-5 mr-2" />
                创建行程（离线）
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div key={trip.id} className="relative group">
                <Link href={`/dashboard/trips/${trip.id}`}>
                  <Card className="hover:shadow-lg transition cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-xl">{trip.destination}</CardTitle>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                          {getStatusText(trip.status)}
                        </span>
                      </div>
                      <CardDescription>
                        {trip.preferences.join(', ') || '无特殊偏好'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(new Date(trip.start_date), 'yyyy-MM-dd')} 至{' '}
                          {format(new Date(trip.end_date), 'yyyy-MM-dd')}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          预算: ¥{trip.budget.toLocaleString()}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {trip.travelers} 人出行
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, trip.id, trip.destination)}
                  disabled={deletingId === trip.id}
                  className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="删除行程"
                >
                  {deletingId === trip.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* API Key Setup Modal */}
      <ApiKeySetupModal
        isOpen={showApiKeySetup}
        onClose={() => setShowApiKeySetup(false)}
        missingRequired={missingRequired}
        missingOptional={missingOptional}
      />
    </div>
  )
}
