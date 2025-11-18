'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { MapPin, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import PhotoCarousel from '@/components/shared/PhotoCarousel'
import RatingDisplay from '@/components/shared/RatingDisplay'
import { getActivityTypeStyle } from '@/lib/ui-helpers'

interface AttractionCardProps {
  activity: Activity
  onEnrich?: (activity: Activity) => void  // 回调函数，用于获取图片和描述
  isEnriching?: boolean  // 是否正在加载
  isEditMode?: boolean  // 是否处于编辑模式
  onDelete?: () => void  // 删除回调函数
}

export default function AttractionCard({ activity, onEnrich, isEnriching = false, isEditMode = false, onDelete }: AttractionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const activityStyle = getActivityTypeStyle(activity.type)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 图片区域 */}
      <PhotoCarousel
        photos={activity.photos || []}
        alt={activity.name}
        topLeftOverlay={
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${activityStyle.color} backdrop-blur-sm`}>
            <span className="mr-1">{activityStyle.emoji}</span>
            {activity.type === 'attraction' && '景点'}
            {activity.type === 'shopping' && '购物'}
            {activity.type === 'entertainment' && '娱乐'}
            {activity.type === 'relaxation' && '休闲'}
          </div>
        }
        topRightOverlay={
          isEditMode && onDelete ? (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
              aria-label="删除活动"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : undefined
        }
        placeholderContent={
          <>
            {onEnrich && !isEnriching && (
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
          </>
        }
      />

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题和评分 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {activity.name}
          </h3>
          {activity.rating && (
            <RatingDisplay
              rating={activity.rating}
              showNumeric={true}
              className="flex-shrink-0"
            />
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

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  确认删除活动？
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-1">
                  即将删除：<span className="font-medium">{activity.name}</span>
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  此操作仅在保存修改后生效
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.()
                      setShowDeleteDialog(false)
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
