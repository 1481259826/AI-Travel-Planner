'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { MapPin, Clock, DollarSign, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Star, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface AttractionCardProps {
  activity: Activity
  onEnrich?: (activity: Activity) => void  // 回调函数，用于获取图片和描述
  isEnriching?: boolean  // 是否正在加载
}

export default function AttractionCard({ activity, onEnrich, isEnriching = false }: AttractionCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const hasPhotos = activity.photos && activity.photos.length > 0
  const photos = activity.photos || []
  const currentPhoto = photos[currentPhotoIndex]

  // 切换到下一张图片
  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
      setImageError(false)
    }
  }

  // 切换到上一张图片
  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
      setImageError(false)
    }
  }

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

  // 获取活动类型的图标和颜色
  const getActivityStyle = (type: Activity['type']) => {
    const styles = {
      attraction: { emoji: '🎯', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      shopping: { emoji: '🛍️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      entertainment: { emoji: '🎭', color: 'bg-pink-50 text-pink-700 border-pink-200' },
      relaxation: { emoji: '🧘', color: 'bg-green-50 text-green-700 border-green-200' },
    }
    return styles[type] || styles.attraction
  }

  const activityStyle = getActivityStyle(activity.type)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 图片区域 */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        {hasPhotos && !imageError ? (
          <>
            <Image
              src={currentPhoto}
              alt={activity.name}
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
            <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-medium border ${activityStyle.color} backdrop-blur-sm`}>
              <span className="mr-1">{activityStyle.emoji}</span>
              {activity.type === 'attraction' && '景点'}
              {activity.type === 'shopping' && '购物'}
              {activity.type === 'entertainment' && '娱乐'}
              {activity.type === 'relaxation' && '休闲'}
            </div>
          </>
        ) : (
          /* 占位图 */
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <ImageIcon className="w-16 h-16 mb-2" />
            {!hasPhotos && onEnrich && !isEnriching && (
              <button
                onClick={() => onEnrich(activity)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                获取图片和描述
              </button>
            )}
            {isEnriching && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>正在加载...</span>
              </div>
            )}
            {imageError && <p className="text-sm mt-2">图片加载失败</p>}
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题和评分 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {activity.name}
          </h3>
          {activity.rating && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="flex">{renderStars(activity.rating)}</div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">
                {activity.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* 简短描述 */}
        {activity.short_desc && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {activity.short_desc}
          </p>
        )}

        {/* 详细描述（可展开） */}
        {activity.long_desc && (
          <div className="mb-3">
            <div className={`text-sm text-gray-700 dark:text-gray-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
              {activity.long_desc}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-1 transition-colors"
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

        {/* 如果没有增强描述，显示原始描述 */}
        {!activity.short_desc && !activity.long_desc && activity.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {activity.description}
          </p>
        )}

        {/* 详细信息 */}
        <div className="space-y-2 text-sm">
          {/* 时间和时长 */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{activity.time}</span>
            {activity.duration && (
              <>
                <span className="text-gray-400">·</span>
                <span>{activity.duration}</span>
              </>
            )}
          </div>

          {/* 地点 */}
          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">{activity.location.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">{activity.location.address}</div>
            </div>
          </div>

          {/* 门票价格 */}
          {activity.ticket_price !== undefined && activity.ticket_price > 0 && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>门票 ¥{activity.ticket_price}</span>
            </div>
          )}

          {/* 旅行建议 */}
          {activity.tips && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div className="flex-1">
                  <div className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">旅行建议</div>
                  <div className="text-sm text-amber-700 dark:text-amber-400">{activity.tips}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
