'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Users, MapPin, DollarSign, Loader2, Map, Trash2, Receipt, BarChart3, Database, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Trip } from '@/types'
import MapView, { extractLocationsFromItinerary } from '@/components/MapView'
import ExpenseForm from '@/components/ExpenseForm'
import ExpenseList from '@/components/ExpenseList'
import BudgetChart from '@/components/BudgetChart'
import ShareButton from '@/components/ShareButton'
import { Expense } from '@/types/expense'
import { useOfflineTrip } from '@/hooks/useOfflineTrip'
import { offlineExpenses, offlineData } from '@/lib/offline'
import { cacheExpensesFromServer } from '@/lib/sync'

export default function TripDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string

  // Use offline-first hook for trip data
  const { trip, isLoading: loading, error, refetch, updateTrip, fromCache } = useOfflineTrip(tripId)

  const [showMap, setShowMap] = useState(true)
  const [showRoute, setShowRoute] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 费用追踪相关状态
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'analytics'>('itinerary')

  // 提取所有位置信息用于地图显示
  const itinerary = trip?.itinerary
  const allLocations = itinerary?.days
    ? itinerary.days.flatMap(day =>
        extractLocationsFromItinerary(day.activities || [], day.meals || [])
      )
    : []

  useEffect(() => {
    setMounted(true)
    fetchExpenses()
  }, [tripId])

  // 调试：输出位置信息
  useEffect(() => {
    if (trip) {
      console.log('行程数据:', itinerary)
      console.log('提取的位置数量:', allLocations.length)
      console.log('位置详情:', allLocations)
    }
  }, [trip, itinerary, allLocations])

  const fetchExpenses = async () => {
    setLoadingExpenses(true)
    try {
      // Try to load from cache first
      const cachedExpenses = await offlineExpenses.getByTrip(tripId)
      if (cachedExpenses.length > 0) {
        setExpenses(cachedExpenses)
      }

      // Then try to fetch from server if online
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
      if (isOnline) {
        try {
          const { data, error } = await supabase.from('expenses')
            .select('*')
            .eq('trip_id', tripId)
            .order('date', { ascending: false })

          if (error) throw error

          if (data) {
            // Update cache with fresh data
            await cacheExpensesFromServer(tripId)
            setExpenses(data)
          }
        } catch (networkError) {
          console.error('Failed to fetch expenses from server, using cache:', networkError)
          // Continue using cached data
        }
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoadingExpenses(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      alert('费用记录已删除')
      fetchExpenses()
    } catch (error: any) {
      alert(error.message || '删除费用记录失败')
    }
  }

  const handleEditExpense = async (expense: Expense) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
        })
        .eq('id', expense.id)

      if (error) throw error

      alert('费用记录已更新')
      fetchExpenses()
    } catch (error: any) {
      alert(error.message || '更新费用记录失败')
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个行程吗？此操作无法撤销。')) {
      return
    }

    setDeleting(true)
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      // Delete from server and cache
      if (isOnline) {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId)

        if (error) throw error
      }

      // Delete from offline cache
      await offlineData.deleteTrip(tripId, !isOnline)

      alert('行程已删除')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting trip:', error)
      alert('删除行程失败')
      setDeleting(false)
    }
  }

  const handleShareUpdate = async (shareToken: string, isPublic: boolean) => {
    // 更新本地状态
    if (trip) {
      await updateTrip({
        ...trip,
        share_token: shareToken,
        is_public: isPublic
      })
    }
  }

  // 计算总开销
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载行程中...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">行程不存在</h2>
          <Button onClick={() => router.push('/dashboard')}>返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{trip.destination} 之旅</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {trip.start_date} 至 {trip.end_date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mounted && fromCache && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">离线数据</span>
                </div>
              )}
              {mounted && !fromCache && typeof navigator !== 'undefined' && navigator.onLine && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <Cloud className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">已同步</span>
                </div>
              )}
              <ShareButton trip={trip} onShareUpdate={handleShareUpdate} />
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除行程
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'itinerary'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                行程安排
              </div>
              {activeTab === 'itinerary' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'expenses'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                费用追踪
                {expenses.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                    {expenses.length}
                  </span>
                )}
              </div>
              {activeTab === 'expenses' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'analytics'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                数据分析
              </div>
              {activeTab === 'analytics' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>
          {/* Tab Content */}
          {activeTab === 'itinerary' ? (
            <>
              {/* Trip Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>行程概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">目的地</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{trip.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">天数</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {Math.ceil(
                            (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) + 1} 天
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">人数</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{trip.travelers} 人</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">预算</p>
                        <p className="font-semibold text-gray-900 dark:text-white">¥{trip.budget.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {trip.preferences && trip.preferences.length > 0 && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">旅行偏好</p>
                      <div className="flex flex-wrap gap-2">
                        {trip.preferences.map((pref) => (
                          <span
                            key={pref}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                          >
                            {pref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Itinerary Summary */}
              {trip.itinerary?.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>行程概述</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{trip.itinerary.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Map View */}
              {trip.itinerary?.days && trip.itinerary.days.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Map className="w-5 h-5" />
                        行程地图
                      </CardTitle>
                      {allLocations.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant={showMap ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowMap(!showMap)}
                          >
                            {showMap ? '隐藏地图' : '显示地图'}
                          </Button>
                          {showMap && allLocations.length > 1 && (
                            <Button
                              variant={showRoute ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowRoute(!showRoute)}
                            >
                              {showRoute ? '隐藏路线' : '显示路线'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {allLocations.length > 0 ? (
                      <>
                        {showMap && (
                          <>
                            <MapView
                              locations={allLocations}
                              showRoute={showRoute}
                              className="w-full"
                            />
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>提示：</strong> 点击地图上的标记查看详细信息。
                                {allLocations.length > 1 && '开启路线规划可查看推荐行进路线。'}
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">地图数据不可用</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                              当前行程中没有包含地理位置信息（经纬度坐标）。
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              建议：重新生成行程时，AI 可能会自动添加位置信息。如果问题持续存在，请检查 AI 模型配置。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Daily Plans */}
              {trip.itinerary?.days && trip.itinerary.days.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">每日行程</h2>
                  {trip.itinerary.days.map((day) => (
                    <Card key={day.day}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>第 {day.day} 天 - {day.date}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Activities */}
                        {day.activities && day.activities.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">活动安排</h4>
                            <div className="space-y-3">
                              {day.activities.map((activity, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 min-w-[60px]">
                                    {activity.time}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900 dark:text-white">{activity.name}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{activity.description}</p>
                                    {activity.location && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        📍 {activity.location.name}
                                      </p>
                                    )}
                                    <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      {activity.duration && <span>⏱️ {activity.duration}</span>}
                                      {activity.ticket_price && (
                                        <span>💰 ¥{activity.ticket_price}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meals */}
                        {day.meals && day.meals.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">用餐推荐</h4>
                            <div className="space-y-3">
                              {day.meals.map((meal, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                  <div className="text-sm font-medium text-amber-600 dark:text-amber-400 min-w-[60px]">
                                    {meal.time}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900 dark:text-white">{meal.restaurant}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      {meal.cuisine} · 人均 ¥{meal.avg_price}
                                    </p>
                                    {meal.recommended_dishes && meal.recommended_dishes.length > 0 && (
                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        推荐菜品：{meal.recommended_dishes.join('、')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Cost Breakdown */}
              {trip.itinerary?.estimated_cost && (
                <Card>
                  <CardHeader>
                    <CardTitle>费用预估</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">住宿</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{trip.itinerary.estimated_cost.accommodation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">交通</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{trip.itinerary.estimated_cost.transportation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">餐饮</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{trip.itinerary.estimated_cost.food.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">景点门票</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{trip.itinerary.estimated_cost.attractions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">其他</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{trip.itinerary.estimated_cost.other.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t dark:border-gray-700 font-bold text-lg">
                        <span className="text-gray-900 dark:text-white">总计</span>
                        <span className="text-blue-600 dark:text-blue-400">¥{trip.itinerary.estimated_cost.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : activeTab === 'expenses' ? (
            <>
              {/* Expense Tracking Tab */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Expense Form */}
                <div className="lg:col-span-1">
                  <ExpenseForm
                    tripId={tripId}
                    budget={trip.budget}
                    totalExpenses={totalExpenses}
                    onSuccess={fetchExpenses}
                  />
                </div>

                {/* Right: Expense List */}
                <div className="lg:col-span-2">
                  {loadingExpenses ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">加载费用记录中...</p>
                    </div>
                  ) : (
                    <ExpenseList
                      expenses={expenses}
                      budget={trip.budget}
                      onDelete={handleDeleteExpense}
                      onEdit={handleEditExpense}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Analytics Tab */}
              {loadingExpenses ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">加载数据中...</p>
                </div>
              ) : expenses.length > 0 ? (
                <BudgetChart
                  expenses={expenses}
                  totalBudget={trip.budget}
                  tripName={trip.destination}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">暂无费用数据</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    请先在"费用追踪"标签页添加一些费用记录，才能查看数据分析
                  </p>
                  <Button onClick={() => setActiveTab('expenses')}>
                    前往添加费用
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
