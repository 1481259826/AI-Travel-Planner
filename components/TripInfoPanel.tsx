'use client'

import { Trip } from '@/types'
import { Calendar, MapPin, Users, DollarSign, Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface TripInfoPanelProps {
  trip: Trip
}

/**
 * 行程信息面板组件
 * 整合显示：行程概览、行程概述、费用预估
 */
export default function TripInfoPanel({ trip }: TripInfoPanelProps) {
  // 计算天数
  const tripDays = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
    (1000 * 60 * 60 * 24)
  ) + 1

  return (
    <div className="space-y-4">
      {/* 行程概览卡片 */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {trip.destination} 旅行计划
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 日期 */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">日期</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {trip.start_date}{trip.start_time ? ` ${trip.start_time}` : ''} 至 {trip.end_date}{trip.end_time ? ` ${trip.end_time}` : ''}
              </p>
              {(trip.start_time || trip.end_time) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {trip.start_time && `到达: ${trip.start_time}`}
                  {trip.start_time && trip.end_time && ' / '}
                  {trip.end_time && `离开: ${trip.end_time}`}
                </p>
              )}
            </div>
          </div>

          {/* 目的地与天数 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">目的地</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trip.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">行程</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{tripDays} 天</p>
              </div>
            </div>
          </div>

          {/* 人数与预算 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">出行人数</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{trip.travelers} 人</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">预算</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">¥{trip.budget.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* 旅行偏好 */}
          {trip.preferences && trip.preferences.length > 0 && (
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">旅行偏好</p>
              <div className="flex flex-wrap gap-1.5">
                {trip.preferences.map((pref) => (
                  <span
                    key={pref}
                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                  >
                    {pref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 行程概述（建议）卡片 */}
      {trip.itinerary?.summary && (
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {trip.itinerary.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 费用预估卡片 */}
      {trip.itinerary?.estimated_cost && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              预算明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 景点门票 */}
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">景点门票</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ¥{trip.itinerary.estimated_cost.attractions.toLocaleString()}
                </p>
              </div>

              {/* 酒店住宿 */}
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">酒店住宿</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ¥{trip.itinerary.estimated_cost.accommodation.toLocaleString()}
                </p>
              </div>

              {/* 餐饮费用 */}
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">餐饮费用</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ¥{trip.itinerary.estimated_cost.food.toLocaleString()}
                </p>
              </div>

              {/* 交通费用 */}
              <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">交通费用</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ¥{trip.itinerary.estimated_cost.transportation.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 预估总费用 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">预估总费用</span>
                <span className="text-2xl font-bold">
                  ¥{trip.itinerary.estimated_cost.total.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
