'use client'

import { Star } from 'lucide-react'
import { renderStars } from '@/lib/ui-helpers'

interface RatingDisplayProps {
  rating: number
  /** 是否显示数字评分 */
  showNumeric?: boolean
  /** 星星大小类名，默认 "w-4 h-4" */
  starSize?: string
  /** 数字文本大小类名，默认 "text-sm" */
  numericSize?: string
  /** 自定义类名 */
  className?: string
}

/**
 * 星级评分显示组件
 * 显示星星图标和可选的数字评分
 */
export default function RatingDisplay({
  rating,
  showNumeric = false,
  starSize = 'w-4 h-4',
  numericSize = 'text-sm',
  className = ''
}: RatingDisplayProps) {
  const stars = renderStars(rating)

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {stars.map((star) => {
          if (star.type === 'full') {
            return <Star key={star.key} className={`${starSize} fill-yellow-400 text-yellow-400`} />
          } else if (star.type === 'half') {
            return (
              <div key={star.key} className={`relative ${starSize}`}>
                <Star className={`${starSize} text-gray-300 absolute`} />
                <div className={`overflow-hidden absolute`} style={{ width: '50%' }}>
                  <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
                </div>
              </div>
            )
          } else {
            return <Star key={star.key} className={`${starSize} text-gray-300`} />
          }
        })}
      </div>
      {showNumeric && (
        <span className={`${numericSize} font-medium text-gray-600 dark:text-gray-400 ml-1`}>
          {rating.toFixed(1)} 分
        </span>
      )}
    </div>
  )
}
