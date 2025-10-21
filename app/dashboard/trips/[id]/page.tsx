'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Users, MapPin, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Trip } from '@/types'

export default function TripDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrip()
  }, [tripId])

  const fetchTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (error) throw error
      setTrip(data)
    } catch (error) {
      console.error('Error fetching trip:', error)
      alert('获取行程失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">加载行程中...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">行程不存在</h2>
          <Button onClick={() => router.push('/dashboard')}>返回首页</Button>
        </div>
      </div>
    )
  }

  const itinerary = trip.itinerary

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{trip.destination} 之旅</h1>
              <p className="text-sm text-gray-600">
                {trip.start_date} 至 {trip.end_date}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Trip Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>行程概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">目的地</p>
                    <p className="font-semibold">{trip.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">天数</p>
                    <p className="font-semibold">
                      {Math.ceil(
                        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1} 天
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">人数</p>
                    <p className="font-semibold">{trip.travelers} 人</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">预算</p>
                    <p className="font-semibold">¥{trip.budget.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {trip.preferences && trip.preferences.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">旅行偏好</p>
                  <div className="flex flex-wrap gap-2">
                    {trip.preferences.map((pref) => (
                      <span
                        key={pref}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
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
          {itinerary?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>行程概述</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{itinerary.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Daily Plans */}
          {itinerary?.days && itinerary.days.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">每日行程</h2>
              {itinerary.days.map((day) => (
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
                        <h4 className="font-semibold text-gray-900 mb-3">活动安排</h4>
                        <div className="space-y-3">
                          {day.activities.map((activity, idx) => (
                            <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-blue-600 min-w-[60px]">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{activity.name}</h5>
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                {activity.location && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    📍 {activity.location.name}
                                  </p>
                                )}
                                <div className="flex gap-4 mt-2 text-sm text-gray-600">
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
                        <h4 className="font-semibold text-gray-900 mb-3">用餐推荐</h4>
                        <div className="space-y-3">
                          {day.meals.map((meal, idx) => (
                            <div key={idx} className="flex gap-3 p-3 bg-amber-50 rounded-lg">
                              <div className="text-sm font-medium text-amber-600 min-w-[60px]">
                                {meal.time}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{meal.restaurant}</h5>
                                <p className="text-sm text-gray-600">
                                  {meal.cuisine} · 人均 ¥{meal.avg_price}
                                </p>
                                {meal.recommended_dishes && meal.recommended_dishes.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-1">
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
          {itinerary?.estimated_cost && (
            <Card>
              <CardHeader>
                <CardTitle>费用预估</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">住宿</span>
                    <span className="font-semibold">¥{itinerary.estimated_cost.accommodation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">交通</span>
                    <span className="font-semibold">¥{itinerary.estimated_cost.transportation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">餐饮</span>
                    <span className="font-semibold">¥{itinerary.estimated_cost.food.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">景点门票</span>
                    <span className="font-semibold">¥{itinerary.estimated_cost.attractions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">其他</span>
                    <span className="font-semibold">¥{itinerary.estimated_cost.other.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>总计</span>
                    <span className="text-blue-600">¥{itinerary.estimated_cost.total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
