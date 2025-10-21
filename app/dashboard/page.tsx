'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plane, Plus, MapPin, Calendar, DollarSign, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { auth, db } from '@/lib/supabase'
import { Trip } from '@/types'
import { format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { user, error } = await auth.getUser()

    if (error || !user) {
      router.push('/login')
      return
    }

    setUser(user)
    await loadTrips(user.id)
  }

  const loadTrips = async (userId: string) => {
    const { data, error } = await db.trips.getAll(userId)

    if (!error && data) {
      setTrips(data)
    }

    setLoading(false)
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
      const { error } = await db.trips.delete(tripId)

      if (error) throw error

      // 从列表中移除已删除的行程
      setTrips(trips.filter(trip => trip.id !== tripId))
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Plane className="w-12 h-12 text-blue-600 animate-bounce mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">AI 旅行规划师</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">欢迎, {user?.email}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">我的行程</h2>
            <p className="text-gray-600 mt-2">管理您的旅行计划</p>
          </div>
          <Link href="/dashboard/create">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              创建新行程
            </Button>
          </Link>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              还没有旅行计划
            </h3>
            <p className="text-gray-600 mb-6">
              创建您的第一个行程，开始规划精彩旅程
            </p>
            <Link href="/dashboard/create">
              <Button>
                <Plus className="w-5 h-5 mr-2" />
                创建行程
              </Button>
            </Link>
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
    </div>
  )
}
