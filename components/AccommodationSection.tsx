'use client'

import { Accommodation } from '@/types'
import HotelCard from './HotelCard'
import { Hotel, Info } from 'lucide-react'

interface AccommodationSectionProps {
  accommodations: Accommodation[]
  onShowHotelOnMap?: (hotel: Accommodation) => void
  onEnrichHotel?: (hotel: Accommodation) => void  // 回调函数，用于获取图片和描述
  enrichingHotels?: Set<string>  // 正在增强的酒店名称集合
}

export default function AccommodationSection({ accommodations, onShowHotelOnMap, onEnrichHotel, enrichingHotels }: AccommodationSectionProps) {
  // 如果没有住宿信息，不渲染
  if (!accommodations || accommodations.length === 0) {
    return null
  }

  // 按入住日期排序
  const sortedAccommodations = [...accommodations].sort((a, b) => {
    return new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
  })

  // 计算总住宿费用
  const totalCost = accommodations.reduce((sum, hotel) => sum + hotel.total_price, 0)

  return (
    <div className="space-y-4" id="accommodation-section">
      {/* 标题和总费用 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            推荐住宿
          </h2>
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded">
            {accommodations.length} 个选择
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">住宿总计</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ¥{totalCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
            AI 推荐说明
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-400">
            以下住宿由 AI 根据您的行程、预算和偏好精心推荐。价格为参考估价，实际价格可能因预订时间和房型而异。建议您尽早预订以获得更优惠的价格。
          </div>
        </div>
      </div>

      {/* 酒店卡片列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedAccommodations.map((hotel, index) => (
          <HotelCard
            key={index}
            hotel={hotel}
            onShowOnMap={onShowHotelOnMap ? () => onShowHotelOnMap(hotel) : undefined}
            onEnrich={onEnrichHotel ? () => onEnrichHotel(hotel) : undefined}
            isEnriching={enrichingHotels?.has(hotel.name) || false}
          />
        ))}
      </div>

      {/* 预订建议 */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-xl">💡</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
              预订提示
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>• 建议提前 2-4 周预订，可获得更优惠的价格</li>
              <li>• 查看酒店的取消政策，选择灵活退订的房型</li>
              <li>• 直接联系酒店可能获得比在线平台更优惠的价格</li>
              <li>• 考虑使用携程、飞猪、美团等平台比价</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
