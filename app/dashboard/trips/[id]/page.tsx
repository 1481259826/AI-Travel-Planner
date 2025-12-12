'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Users, MapPin, DollarSign, Loader2, Trash2, Receipt, BarChart3, Database, Cloud, MessageCircle, Sparkles, FileStack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Trip, Activity, Accommodation } from '@/types'
import MapView, { extractLocationsFromItinerary, MapLocation } from '@/components/MapView'
import AccommodationSection from '@/components/AccommodationSection'
import ExpenseForm from '@/components/ExpenseForm'
import ExpenseList from '@/components/ExpenseList'
import BudgetChart from '@/components/BudgetChart'
import ShareButton from '@/components/ShareButton'
import { ExportPdfButton } from '@/components/ExportPdfButton'
import SyncToAmapButton from '@/components/SyncToAmapButton'
import AttractionCard from '@/components/AttractionCard'
import ItineraryNav from '@/components/ItineraryNav'
import EditModeControls from '@/components/EditModeControls'
import AddItemModal from '@/components/AddItemModal'
import WeatherCard from '@/components/WeatherCard'
import FullScreenMapModal from '@/components/FullScreenMapModal'
import TripInfoPanel from '@/components/TripInfoPanel'
import TripOverviewMap from '@/components/TripOverviewMap'
import { TripChatPanel } from '@/components/chat'
import { TemplateSaveModal } from '@/components/templates'
import { Expense } from '@/types/expense'
import { useOfflineTrip } from '@/hooks/useOfflineTrip'
import { offlineExpenses, offlineData } from '@/lib/offline'
import { cacheExpensesFromServer } from '@/lib/sync'
import { useItineraryStore } from '@/lib/stores/itinerary-store'
import { AmapWeatherForecast } from '@/lib/amap-weather'
import { appConfig } from '@/lib/config/app.config'

export default function TripDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string

  // Use offline-first hook for trip data
  const { trip, isLoading: loading, error, refetch, updateTrip, fromCache } = useOfflineTrip(tripId)

  const [showMap, setShowMap] = useState(true) // 默认显示地图
  const [showRoute, setShowRoute] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 费用追踪相关状态
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'analytics'>('itinerary')

  // 景点图片加载状态
  const [enrichingActivities, setEnrichingActivities] = useState<Set<string>>(new Set())

  // 酒店图片加载状态
  const [enrichingHotels, setEnrichingHotels] = useState<Set<string>>(new Set())

  // 编辑模式状态
  const { isEditMode, editingTrip, deleteActivity, addActivity } = useItineraryStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDayIndex, setAddModalDayIndex] = useState(0)

  // 天气数据状态
  const [weatherData, setWeatherData] = useState<AmapWeatherForecast[]>([])
  const [loadingWeather, setLoadingWeather] = useState(false)

  // 全屏地图状态
  const [fullScreenMapDay, setFullScreenMapDay] = useState<{ dayNumber: number; activities: Activity[] } | null>(null)

  // 对话侧边栏状态
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)
  // 高亮修改的天数
  const [highlightedDays, setHighlightedDays] = useState<number[]>([])
  // 保存为模板的模态框状态
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)

  // 自动加载照片的状态
  const autoEnrichStarted = useRef(false)

  // 提取所有位置信息用于地图显示 - 使用 useMemo 避免重复计算
  // 在编辑模式下使用 editingTrip，否则使用原始 trip
  const displayTrip = isEditMode && editingTrip ? editingTrip : trip
  const allLocations = useMemo(() => {
    const itinerary = displayTrip?.itinerary
    const dayLocations = itinerary?.days
      ? itinerary.days.flatMap(day =>
          extractLocationsFromItinerary(day.activities || [], day.meals || [])
        )
      : []

    // 添加酒店位置
    const hotelLocations: MapLocation[] = (itinerary?.accommodation || []).map((hotel) => ({
      name: hotel.name,
      lat: hotel.location.lat,
      lng: hotel.location.lng,
      type: 'hotel' as const,
      description: `${hotel.type} · 入住: ${new Date(hotel.check_in).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} - 退房: ${new Date(hotel.check_out).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`,
    }))

    return [...dayLocations, ...hotelLocations]
  }, [displayTrip?.itinerary])

  useEffect(() => {
    setMounted(true)
    fetchExpenses()
    if (trip?.destination) {
      fetchWeather()
    }
  }, [tripId, trip?.destination])

  // 自动加载酒店和景点照片
  useEffect(() => {
    if (!trip || !mounted || autoEnrichStarted.current) return

    const autoEnrichPhotos = async () => {
      autoEnrichStarted.current = true

      // 收集需要加载照片的酒店
      const hotelsToEnrich: Accommodation[] = []
      if (trip.itinerary?.accommodation) {
        trip.itinerary.accommodation.forEach(hotel => {
          if (!hotel.photos || hotel.photos.length === 0) {
            hotelsToEnrich.push(hotel)
          }
        })
      }

      // 收集需要加载照片的景点
      const activitiesToEnrich: { activity: Activity; dayIndex: number; activityIndex: number }[] = []
      if (trip.itinerary?.days) {
        trip.itinerary.days.forEach((day, dayIndex) => {
          day.activities?.forEach((activity, activityIndex) => {
            if (!activity.photos || activity.photos.length === 0) {
              activitiesToEnrich.push({ activity, dayIndex, activityIndex })
            }
          })
        })
      }

      // 使用队列逐个加载，避免同时发起太多请求
      // 先加载酒店照片
      for (const hotel of hotelsToEnrich) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 延迟500ms避免请求过快
        await handleEnrichHotel(hotel)
      }

      // 再加载景点照片
      for (const { activity, dayIndex, activityIndex } of activitiesToEnrich) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 延迟500ms避免请求过快
        await handleEnrichActivity(activity, dayIndex, activityIndex)
      }
    }

    autoEnrichPhotos()
  }, [trip, mounted])

  // 获取天气数据
  const fetchWeather = async () => {
    if (!trip?.destination) return

    setLoadingWeather(true)
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(trip.destination)}`)

      if (response.ok) {
        const result = await response.json()
        const data = result.data
        // 修复: API 返回的是 casts 数组,不是 daily
        if (data?.casts && Array.isArray(data.casts)) {
          setWeatherData(data.casts)
        }
      } else {
        console.error('Failed to fetch weather data')
      }
    } catch (error) {
      console.error('Error fetching weather:', error)
    } finally {
      setLoadingWeather(false)
    }
  }

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

  // 为景点获取图片和描述
  const handleEnrichActivity = async (activity: Activity, dayIndex: number, activityIndex: number) => {
    const activityKey = `${dayIndex}-${activityIndex}`

    // 避免重复请求
    if (enrichingActivities.has(activityKey)) {
      return
    }

    setEnrichingActivities(prev => new Set(prev).add(activityKey))

    try {
      // 获取当前用户的 session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch('/api/enrich-attraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,  // 添加 Authorization 头
        },
        body: JSON.stringify({
          name: activity.name,
          destination: trip?.destination,
          locationName: activity.location?.name,
          count: 3,  // 获取3张图片
        }),
      })

      if (!response.ok) {
        throw new Error('获取景点信息失败')
      }

      const result = await response.json()
      const data = result.data

      // 更新行程数据
      if (trip && trip.itinerary) {
        const updatedItinerary = { ...trip.itinerary }
        const updatedActivity = {
          ...activity,
          photos: data?.images || [],
          long_desc: data?.description || activity.description,
          short_desc: data?.description ? data.description.substring(0, 100) + '...' : activity.description,
          rating: 4.5,  // 默认评分，可以后续从API获取
        }

        updatedItinerary.days[dayIndex].activities[activityIndex] = updatedActivity

        // 更新到数据库
        const { error } = await supabase
          .from('trips')
          .update({ itinerary: updatedItinerary })
          .eq('id', tripId)

        if (error) throw error

        // 更新本地状态
        await updateTrip({ ...trip, itinerary: updatedItinerary })

        // 刷新数据
        await refetch()
      }
    } catch (error: any) {
      console.error('Error enriching activity:', error)
      alert(error.message || '获取景点信息失败')
    } finally {
      setEnrichingActivities(prev => {
        const newSet = new Set(prev)
        newSet.delete(activityKey)
        return newSet
      })
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

  // 为酒店获取图片和描述
  const handleEnrichHotel = async (hotel: Accommodation) => {
    const hotelKey = hotel.name

    // 避免重复请求
    if (enrichingHotels.has(hotelKey)) {
      return
    }

    setEnrichingHotels(prev => new Set(prev).add(hotelKey))

    try {
      // 获取当前用户的 session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch('/api/enrich-hotel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: hotel.name,
          destination: trip?.destination,
          type: hotel.type,
          count: 3,  // 获取3张图片
        }),
      })

      if (!response.ok) {
        throw new Error('获取酒店信息失败')
      }

      const result = await response.json()
      const data = result.data

      // 更新行程数据
      if (trip && trip.itinerary && trip.itinerary.accommodation) {
        const updatedItinerary = { ...trip.itinerary }
        const hotelIndex = updatedItinerary.accommodation.findIndex(h => h.name === hotel.name)

        if (hotelIndex !== -1) {
          const updatedHotel = {
            ...hotel,
            photos: data?.images || [],
            description: data?.description || hotel.description,
          }

          updatedItinerary.accommodation[hotelIndex] = updatedHotel

          // 更新到数据库
          const { error } = await supabase
            .from('trips')
            .update({ itinerary: updatedItinerary })
            .eq('id', tripId)

          if (error) throw error

          // 更新本地状态
          await updateTrip({ ...trip, itinerary: updatedItinerary })

          // 刷新数据
          await refetch()
        }
      }
    } catch (error: any) {
      console.error('Error enriching hotel:', error)
      alert(error.message || '获取酒店信息失败')
    } finally {
      setEnrichingHotels(prev => {
        const newSet = new Set(prev)
        newSet.delete(hotelKey)
        return newSet
      })
    }
  }

  // 处理点击酒店的"地图查看"按钮
  const handleShowHotelOnMap = (hotel: Accommodation) => {
    // 确保地图可见
    if (!showMap) {
      setShowMap(true)
    }
    // 滚动到地图区域
    setTimeout(() => {
      const mapElement = document.getElementById('trip-map-section')
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  // 处理点击地图上的酒店标记
  const handleHotelMarkerClick = (hotel: Accommodation) => {
    const section = document.getElementById('accommodation-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 处理添加活动
  const handleAddActivity = (activity: Activity) => {
    addActivity(addModalDayIndex, activity)
  }

  // 打开添加活动模态框
  const openAddModal = (dayIndex: number) => {
    setAddModalDayIndex(dayIndex)
    setShowAddModal(true)
  }

  // 处理保存成功后的刷新
  const handleSaveSuccess = async () => {
    await refetch()
  }

  // 处理对话侧边栏中修改确认成功
  const handleModificationConfirmed = useCallback(async (modificationId: string, affectedDays: number[]) => {
    // 1. 刷新行程数据
    await refetch()

    // 2. 设置高亮天数
    setHighlightedDays(affectedDays)

    // 3. 滚动到第一个受影响的天数
    if (affectedDays.length > 0) {
      const firstAffectedDay = Math.min(...affectedDays) + 1 // affectedDays 是索引，+1 变成天数
      setTimeout(() => {
        const dayElement = document.getElementById(`day-${firstAffectedDay}`)
        if (dayElement) {
          dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }

    // 4. 3秒后清除高亮
    setTimeout(() => {
      setHighlightedDays([])
    }, 3000)
  }, [refetch])

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
              <EditModeControls trip={trip} onSaveSuccess={handleSaveSuccess} />
              {/* 对话助手入口 - 打开侧边栏，根据 Feature Flag 控制显示 */}
              {appConfig.features.useChatAgent && (
                <Button
                  variant="outline"
                  onClick={() => setIsChatPanelOpen(true)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 修改
                </Button>
              )}
              <SyncToAmapButton trip={trip} />
              <ShareButton trip={trip} onShareUpdate={handleShareUpdate} />
              <ExportPdfButton trip={trip} />
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplateModal(true)}
                className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
              >
                <FileStack className="w-4 h-4 mr-2" />
                保存为模板
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              </button>
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
              {/* Itinerary Navigation */}
              {displayTrip?.itinerary?.days && displayTrip.itinerary.days.length > 0 && (
                <ItineraryNav
                  days={displayTrip.itinerary.days.map(day => ({
                    day: day.day,
                    date: day.date
                  }))}
                />
              )}

              {/* 行程信息面板 - 独立一行 */}
              <TripInfoPanel trip={trip} />

              {/* 全行程地图 - 独立一行，全宽显示 */}
              {displayTrip?.itinerary?.days && displayTrip.itinerary.days.length > 0 && (
                <TripOverviewMap
                  days={displayTrip.itinerary.days}
                  accommodation={displayTrip.itinerary?.accommodation || []}
                  onHotelClick={handleHotelMarkerClick}
                />
              )}

              {/* Accommodation Section */}
              {displayTrip?.itinerary?.accommodation && displayTrip.itinerary.accommodation.length > 0 && (
                <AccommodationSection
                  accommodations={displayTrip.itinerary.accommodation}
                  onShowHotelOnMap={handleShowHotelOnMap}
                  onEnrichHotel={handleEnrichHotel}
                  enrichingHotels={enrichingHotels}
                />
              )}

              {/* Daily Plans */}
              {displayTrip?.itinerary?.days && displayTrip.itinerary.days.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">每日行程</h2>
                  {displayTrip.itinerary.days.map((day) => (
                    <Card
                      key={day.day}
                      id={`day-${day.day}`}
                      data-day={day.day}
                      className={`scroll-mt-20 transition-all duration-300 ${
                        highlightedDays.includes(day.day - 1)
                          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 bg-blue-50/50 dark:bg-blue-900/20'
                          : ''
                      }`}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>第 {day.day} 天 - {day.date}</span>
                          {isEditMode && (
                            <button
                              onClick={() => openAddModal(day.day - 1)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              添加活动
                            </button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Weather Information */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            天气预报
                          </h4>
                          <WeatherCard
                            date={day.date}
                            weather={weatherData.find(w => w.date === day.date) || null}
                            isLoading={loadingWeather}
                          />
                        </div>

                        {/* Activities */}
                        {day.activities && day.activities.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">活动安排</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {day.activities.map((activity, idx) => (
                                <AttractionCard
                                  key={idx}
                                  activity={activity}
                                  onEnrich={() => handleEnrichActivity(activity, day.day - 1, idx)}
                                  isEnriching={enrichingActivities.has(`${day.day - 1}-${idx}`)}
                                  isEditMode={isEditMode}
                                  onDelete={() => deleteActivity(day.day - 1, idx)}
                                />
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
                    请先在&ldquo;费用追踪&rdquo;标签页添加一些费用记录，才能查看数据分析
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

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddActivity}
        dayNumber={addModalDayIndex + 1}
      />

      {/* Full Screen Map Modal */}
      {fullScreenMapDay && (
        <FullScreenMapModal
          isOpen={!!fullScreenMapDay}
          onClose={() => setFullScreenMapDay(null)}
          activities={fullScreenMapDay.activities}
          dayNumber={fullScreenMapDay.dayNumber}
        />
      )}

      {/* 悬浮 AI 助手按钮 - 在移动端和桌面端都显示 */}
      {appConfig.features.useChatAgent && !isChatPanelOpen && (
        <button
          onClick={() => setIsChatPanelOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
          title="AI 行程助手"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        </button>
      )}

      {/* 对话侧边栏 */}
      {appConfig.features.useChatAgent && (
        <TripChatPanel
          tripId={tripId}
          destination={trip.destination}
          isOpen={isChatPanelOpen}
          onClose={() => setIsChatPanelOpen(false)}
          onModificationConfirmed={handleModificationConfirmed}
        />
      )}

      {/* 保存为模板模态框 */}
      <TemplateSaveModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        tripId={tripId}
        tripDestination={trip.destination}
        onSuccess={() => {
          setShowSaveTemplateModal(false)
          alert('模板保存成功！您可以在设置页面的「旅行模板」中查看。')
        }}
      />
    </div>
  )
}
