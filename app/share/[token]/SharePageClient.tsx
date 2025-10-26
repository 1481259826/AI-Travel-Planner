'use client'

import { useState } from 'react'
import { Calendar, Users, MapPin, Map, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MapView, { extractLocationsFromItinerary } from '@/components/MapView'

interface SharePageClientProps {
  trip: any
}

export default function SharePageClient({ trip }: SharePageClientProps) {
  const [showMap, setShowMap] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [expandedDays, setExpandedDays] = useState<number[]>([1]) // 默认展开第一天

  // 提取所有位置信息
  const itinerary = trip.itinerary
  const allLocations = itinerary?.days
    ? itinerary.days.flatMap((day: any) =>
        extractLocationsFromItinerary(day.activities || [], day.meals || [])
      )
    : []

  // 切换天数展开状态
  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayNumber)
        ? prev.filter((d) => d !== dayNumber)
        : [...prev, dayNumber]
    )
  }

  // 打印页面
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10 print:static">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {trip.destination} 之旅
              </h1>
              <p className="text-gray-600">
                {trip.start_date} 至 {trip.end_date}
                {trip.profiles?.name && (
                  <span className="ml-4 text-sm">
                    由 <span className="font-medium">{trip.profiles.name}</span> 分享
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="print:hidden"
            >
              <Printer className="w-4 h-4 mr-2" />
              打印
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Trip Overview */}
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">行程概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trip.origin && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">出发地</p>
                      <p className="font-semibold text-lg">{trip.origin}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">目的地</p>
                    <p className="font-semibold text-lg">{trip.destination}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">行程天数</p>
                    <p className="font-semibold text-lg">
                      {Math.ceil(
                        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1} 天
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">同行人数</p>
                    <p className="font-semibold text-lg">{trip.travelers} 人</p>
                  </div>
                </div>
              </div>

              {trip.preferences && trip.preferences.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-3 font-medium">旅行偏好</p>
                  <div className="flex flex-wrap gap-2">
                    {trip.preferences.map((pref: string) => (
                      <span
                        key={pref}
                        className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium"
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
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">行程亮点</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {trip.itinerary.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map View */}
          {allLocations.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur print:break-inside-avoid">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Map className="w-6 h-6" />
                    行程地图
                  </CardTitle>
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      variant={showMap ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowMap(!showMap)}
                    >
                      {showMap ? '隐藏地图' : '显示地图'}
                    </Button>
                    {showMap && allLocations.length > 1 && (
                      <Button
                        variant={showRoute ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowRoute(!showRoute)}
                      >
                        {showRoute ? '隐藏路线' : '显示路线'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {showMap && (
                <CardContent>
                  <MapView
                    locations={allLocations}
                    showRoute={showRoute}
                    className="w-full"
                  />
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      点击地图上的标记查看详细信息
                      {allLocations.length > 1 && '，开启路线规划可查看推荐行进路线'}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Daily Itinerary */}
          {trip.itinerary?.days && trip.itinerary.days.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">每日行程</h2>
              {trip.itinerary.days.map((day: any) => (
                <Card
                  key={day.day}
                  className="shadow-lg border-0 bg-white/90 backdrop-blur print:break-inside-avoid"
                >
                  <CardHeader
                    className="cursor-pointer print:cursor-default"
                    onClick={() => toggleDay(day.day)}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl">
                        第 {day.day} 天 - {day.date}
                      </span>
                      <span className="print:hidden">
                        {expandedDays.includes(day.day) ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent
                    className={`space-y-6 ${!expandedDays.includes(day.day) ? 'hidden print:block' : ''}`}
                  >
                    {/* Activities */}
                    {day.activities && day.activities.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                          活动安排
                        </h4>
                        <div className="space-y-3">
                          {day.activities.map((activity: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex gap-4 p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border-l-4 border-blue-500"
                            >
                              <div className="text-sm font-bold text-blue-600 min-w-[70px]">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900 text-lg mb-1">
                                  {activity.name}
                                </h5>
                                <p className="text-gray-700 leading-relaxed">
                                  {activity.description}
                                </p>
                                {activity.location && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    📍 {activity.location.name}
                                    {activity.location.address && ` - ${activity.location.address}`}
                                  </p>
                                )}
                                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                  {activity.duration && (
                                    <span className="flex items-center gap-1">
                                      ⏱️ {activity.duration}
                                    </span>
                                  )}
                                  {activity.ticket_price && (
                                    <span className="flex items-center gap-1">
                                      💰 ¥{activity.ticket_price}
                                    </span>
                                  )}
                                </div>
                                {activity.tips && (
                                  <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded mt-2">
                                    💡 {activity.tips}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meals */}
                    {day.meals && day.meals.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                          用餐推荐
                        </h4>
                        <div className="space-y-3">
                          {day.meals.map((meal: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex gap-4 p-4 bg-gradient-to-r from-orange-50 to-transparent rounded-lg border-l-4 border-orange-500"
                            >
                              <div className="text-sm font-bold text-orange-600 min-w-[70px]">
                                {meal.time}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900 text-lg">
                                  {meal.restaurant}
                                </h5>
                                <p className="text-gray-700">
                                  {meal.cuisine} · 人均 ¥{meal.avg_price}
                                </p>
                                {meal.location && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    📍 {meal.location.name}
                                  </p>
                                )}
                                {meal.recommended_dishes && meal.recommended_dishes.length > 0 && (
                                  <p className="text-sm text-gray-700 mt-2">
                                    <span className="font-medium">推荐菜品：</span>
                                    {meal.recommended_dishes.join('、')}
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

          {/* Accommodation */}
          {trip.itinerary?.accommodation && trip.itinerary.accommodation.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur print:break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-2xl">住宿推荐</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trip.itinerary.accommodation.map((acc: any, idx: number) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-semibold text-gray-900 text-lg mb-2">{acc.name}</h5>
                      <p className="text-sm text-gray-600">
                        {acc.type} · {acc.check_in} 至 {acc.check_out}
                      </p>
                      {acc.location && (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 {acc.location.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mt-2">
                        ¥{acc.price_per_night}/晚 · 共 ¥{acc.total_price}
                      </p>
                      {acc.amenities && acc.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {acc.amenities.map((amenity: string) => (
                            <span
                              key={amenity}
                              className="px-2 py-1 bg-white text-gray-600 rounded text-xs"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transportation */}
          {trip.itinerary?.transportation && (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur print:break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-2xl">交通信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trip.itinerary.transportation.to_destination && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">前往目的地</h5>
                    <p className="text-gray-700">
                      {trip.itinerary.transportation.to_destination.method}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {trip.itinerary.transportation.to_destination.details}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      费用：¥{trip.itinerary.transportation.to_destination.cost}
                    </p>
                  </div>
                )}
                {trip.itinerary.transportation.local && (
                  <div className="pt-4 border-t">
                    <h5 className="font-semibold text-gray-900 mb-2">当地交通</h5>
                    <p className="text-gray-700">
                      推荐：{trip.itinerary.transportation.local.methods?.join('、')}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      预估费用：¥{trip.itinerary.transportation.local.estimated_cost}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center py-8 text-gray-600 print:hidden">
            <p className="mb-2">使用 AI 旅行规划师创建您的专属行程</p>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              立即开始规划
            </a>
          </div>
        </div>
      </main>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
