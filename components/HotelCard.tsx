'use client'

import { useState } from 'react'
import { Accommodation } from '@/types'
import { MapPin, Calendar, DollarSign, Star, Wifi, Coffee, Utensils, Dumbbell, Waves, ShieldCheck, Car, Wind, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { usePhotoCarousel } from '@/hooks/usePhotoCarousel'

interface HotelCardProps {
  hotel: Accommodation
  onShowOnMap?: () => void
  onEnrich?: (hotel: Accommodation) => void  // 回调函数，用于获取图片和描述
  isEnriching?: boolean  // 是否正在加载
}

export default function HotelCard({ hotel, onShowOnMap, onEnrich, isEnriching = false }: HotelCardProps) {
  // 使用照片轮播 Hook
  const {
    currentIndex: currentPhotoIndex,
    currentPhoto,
    hasPhotos,
    nextPhoto,
    prevPhoto
  } = usePhotoCarousel({ photos: hotel.photos || [] })

  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 渲染评分星星
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative w-4 h-4">
            <Star className="w-4 h-4 text-gray-300 absolute" />
            <div className="overflow-hidden w-2 absolute">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
      }
    }
    return stars
  }

  // 获取酒店类型的样式
  const getHotelTypeStyle = (type: Accommodation['type']) => {
    const styles = {
      hotel: { emoji: '🏨', label: '酒店', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
      hostel: { emoji: '🏠', label: '青年旅舍', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' },
      apartment: { emoji: '🏢', label: '公寓', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
      resort: { emoji: '🏝️', label: '度假村', color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800' },
    }
    return styles[type] || styles.hotel
  }

  // 设施图标映射
  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase()
    if (lowerAmenity.includes('wifi') || lowerAmenity.includes('网络')) return <Wifi className="w-4 h-4" />
    if (lowerAmenity.includes('餐') || lowerAmenity.includes('早餐')) return <Utensils className="w-4 h-4" />
    if (lowerAmenity.includes('健身') || lowerAmenity.includes('gym')) return <Dumbbell className="w-4 h-4" />
    if (lowerAmenity.includes('游泳') || lowerAmenity.includes('pool')) return <Waves className="w-4 h-4" />
    if (lowerAmenity.includes('停车') || lowerAmenity.includes('parking')) return <Car className="w-4 h-4" />
    if (lowerAmenity.includes('空调') || lowerAmenity.includes('air')) return <Wind className="w-4 h-4" />
    if (lowerAmenity.includes('安全')) return <ShieldCheck className="w-4 h-4" />
    return <Coffee className="w-4 h-4" />
  }

  const hotelStyle = getHotelTypeStyle(hotel.type)

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  // 计算住宿天数
  const calculateNights = () => {
    const checkIn = new Date(hotel.check_in)
    const checkOut = new Date(hotel.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return nights
  }

  const nights = calculateNights()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 图片区域 */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        {hasPhotos && !imageError ? (
          <>
            <Image
              src={currentPhoto}
              alt={hotel.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />

            {/* 图片导航 */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="上一张图片"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="下一张图片"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* 图片指示器 */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentPhotoIndex(index)
                        setImageError(false)
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentPhotoIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`切换到第${index + 1}张图片`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* 类型标签 */}
            <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-medium border ${hotelStyle.color} backdrop-blur-sm`}>
              <span className="mr-1">{hotelStyle.emoji}</span>
              {hotelStyle.label}
            </div>
          </>
        ) : (
          /* 占位图 */
          <div className="relative w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <ImageIcon className="w-16 h-16 mb-2" />
            {!hasPhotos && onEnrich && !isEnriching && (
              <button
                onClick={() => onEnrich(hotel)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                获取图片和描述
              </button>
            )}
            {isEnriching && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>正在加载...</span>
              </div>
            )}
            {imageError && <p className="text-sm mt-2">图片加载失败</p>}
          </div>
        )}
      </div>

      {/* 头部区域 */}
      <div className="relative p-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          {/* 酒店名称和类型 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {hotel.name}
              </h3>
              {/* 类型标签仅在无照片时显示 */}
              {!hasPhotos && (
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${hotelStyle.color}`}>
                  <span className="mr-1">{hotelStyle.emoji}</span>
                  {hotelStyle.label}
                </div>
              )}
            </div>

            {/* 评分 */}
            {hotel.rating && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex">{renderStars(hotel.rating)}</div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">
                  {hotel.rating.toFixed(1)} 分
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 space-y-3">
        {/* 入住信息 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-500">入住</div>
              <div className="font-medium">{formatDate(hotel.check_in)}</div>
            </div>
          </div>

          <div className="text-gray-400">→</div>

          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-500">退房</div>
              <div className="font-medium">{formatDate(hotel.check_out)}</div>
            </div>
          </div>

          <div className="ml-auto px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
            {nights} 晚
          </div>
        </div>

        {/* 地点 */}
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">{hotel.location.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{hotel.location.address}</div>
          </div>
          {onShowOnMap && (
            <button
              onClick={onShowOnMap}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium whitespace-nowrap transition-colors"
            >
              地图查看
            </button>
          )}
        </div>

        {/* 价格信息 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">¥{hotel.price_per_night}</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">/晚</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-500">总计</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              ¥{hotel.total_price}
            </div>
          </div>
        </div>

        {/* AI 生成的描述（可展开） */}
        {hotel.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className={`text-sm text-gray-700 dark:text-gray-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
              {hotel.description}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 mt-1 transition-colors"
            >
              {isExpanded ? (
                <>
                  收起 <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  查看更多 <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* 设施标签 */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">设施服务</div>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((amenity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs"
                >
                  {getAmenityIcon(amenity)}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
