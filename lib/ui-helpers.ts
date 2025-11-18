/**
 * UI 辅助函数
 * 提供常用的 UI 渲染和格式化工具
 */

import { Activity, Accommodation } from '@/types'

/**
 * 每日颜色映射（用于地图路线和标记）
 */
export const DAY_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
] as const

/**
 * 获取指定天数的颜色
 */
export function getDayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]
}

/**
 * 活动类型 Emoji 映射
 */
export const ACTIVITY_TYPE_EMOJI = {
  attraction: '🎯',
  shopping: '🛍️',
  entertainment: '🎭',
  relaxation: '🧘',
  sightseeing: '🏛️',
  museum: '🖼️',
  adventure: '⛰️',
  dining: '🍽️',
  other: '📍',
} as const

/**
 * 获取活动类型的 Emoji
 */
export function getActivityEmoji(type: Activity['type']): string {
  return ACTIVITY_TYPE_EMOJI[type] || ACTIVITY_TYPE_EMOJI.other
}

/**
 * 活动类型样式映射
 */
export const ACTIVITY_TYPE_STYLES = {
  attraction: {
    emoji: '🎯',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
  },
  shopping: {
    emoji: '🛍️',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
  },
  entertainment: {
    emoji: '🎭',
    color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800'
  },
  relaxation: {
    emoji: '🧘',
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
  },
} as const

/**
 * 获取活动类型的样式
 */
export function getActivityTypeStyle(type: Activity['type']) {
  return ACTIVITY_TYPE_STYLES[type] || ACTIVITY_TYPE_STYLES.attraction
}

/**
 * 住宿类型样式映射
 */
export const ACCOMMODATION_TYPE_STYLES = {
  hotel: {
    emoji: '🏨',
    label: '酒店',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
  },
  hostel: {
    emoji: '🏠',
    label: '青年旅舍',
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
  },
  apartment: {
    emoji: '🏢',
    label: '公寓',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
  },
  resort: {
    emoji: '🏝️',
    label: '度假村',
    color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800'
  },
  guesthouse: {
    emoji: '🏡',
    label: '民宿',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
  },
  other: {
    emoji: '🏨',
    label: '其他',
    color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
  },
} as const

/**
 * 获取住宿类型的样式
 */
export function getAccommodationTypeStyle(type: Accommodation['type']) {
  return ACCOMMODATION_TYPE_STYLES[type] || ACCOMMODATION_TYPE_STYLES.hotel
}

/**
 * 交通站点关键词列表
 */
export const TRANSPORTATION_KEYWORDS = [
  '站', '机场', '火车站', '高铁站', '动车站',
  '地铁站', '汽车站', '客运站', '码头', '港口',
  'station', 'airport', 'railway', 'terminal', 'port',
  '前往', '出发', '到达', '乘坐', '搭乘',
  '地铁', '公交', '打车', '步行', '骑行'
] as const

/**
 * 判断是否为交通活动
 */
export function isTransportationActivity(activity: Activity): boolean {
  const name = activity.name || ''
  const description = activity.description || ''
  const text = `${name} ${description}`.toLowerCase()

  return TRANSPORTATION_KEYWORDS.some(keyword =>
    text.includes(keyword.toLowerCase())
  )
}

/**
 * 渲染星级评分
 * @param rating - 评分（0-5）
 * @returns JSX 元素数组
 */
export function renderStars(rating: number) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push({ key: i, type: 'full' })
    } else if (i === fullStars && hasHalfStar) {
      stars.push({ key: i, type: 'half' })
    } else {
      stars.push({ key: i, type: 'empty' })
    }
  }

  return stars
}

/**
 * 格式化货币
 * @param amount - 金额
 * @param currency - 货币代码
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * 格式化日期
 * @param date - 日期字符串或 Date 对象
 * @param format - 格式类型
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'numeric' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (format === 'numeric') {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: format === 'long' ? 'long' : 'numeric',
    day: 'numeric',
  })
}

/**
 * 格式化时间范围
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 格式化后的时间范围字符串
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = formatDate(startDate, 'numeric')
  const end = formatDate(endDate, 'numeric')
  return `${start} 至 ${end}`
}

/**
 * 计算天数差
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 天数差
 */
export function getDaysDiff(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
