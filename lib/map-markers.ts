import { Activity, Accommodation } from '@/types'
import { getActivityEmoji, DAY_COLORS } from './ui-helpers'

/**
 * 地图位置类型
 */
export interface MapLocation {
  name: string
  lat: number
  lng: number
  type: 'activity' | 'meal' | 'hotel'
  description?: string
  time?: string
}

/**
 * 计算多个位置的中心点
 */
export function calculateMapCenter(locations: MapLocation[]): { lat: number; lng: number } {
  if (locations.length === 0) {
    return { lat: 39.9042, lng: 116.4074 } // 默认北京
  }

  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng
    }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length
  }
}

/**
 * 创建地图标记信息窗口内容
 */
export function createMapInfoWindowContent(location: MapLocation, index: number): string {
  const getIconAndType = () => {
    switch (location.type) {
      case 'activity':
        return { icon: '🎯', typeText: '活动' }
      case 'meal':
        return { icon: '🍽️', typeText: '餐饮' }
      case 'hotel':
        return { icon: '🏨', typeText: '住宿' }
      default:
        return { icon: '📍', typeText: '地点' }
    }
  }

  const { icon, typeText } = getIconAndType()

  return `
    <div style="padding: 12px; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 20px;">${icon}</span>
        <div>
          <div style="font-weight: bold; font-size: 16px; color: #1f2937;">${location.name}</div>
          <div style="font-size: 12px; color: #6b7280;">${typeText} · 第 ${index} 站</div>
        </div>
      </div>
      ${location.time ? `<div style="font-size: 14px; color: #4b5563; margin-top: 4px;">⏰ ${location.time}</div>` : ''}
      ${location.description ? `<div style="font-size: 14px; color: #4b5563; margin-top: 4px;">${location.description}</div>` : ''}
    </div>
  `
}

/**
 * 创建活动标记的SVG图标
 */
export function createActivityMarkerIcon(dayNumber: number, indexInDay: number): string {
  const dayColor = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${dayNumber}-${indexInDay}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="grad-${dayNumber}-${indexInDay}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${dayColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${dayColor};stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <!-- 标记主体 -->
      <path
        d="M16 2 C8.82 2 3 7.82 3 15 C3 24 16 40 16 40 S29 24 29 15 C29 7.82 23.18 2 16 2 Z"
        fill="url(#grad-${dayNumber}-${indexInDay})"
        stroke="white"
        stroke-width="2"
        filter="url(#shadow-${dayNumber}-${indexInDay})"
      />
      <!-- 内圆 -->
      <circle cx="16" cy="15" r="8" fill="white" opacity="0.9"/>
      <!-- 数字背景 -->
      <circle cx="16" cy="15" r="7" fill="${dayColor}"/>
      <!-- 数字文本 -->
      <text x="16" y="15" text-anchor="middle" dominant-baseline="central"
            fill="white" font-size="11" font-weight="bold" font-family="Arial, sans-serif">
        ${indexInDay + 1}
      </text>
    </svg>
  `

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon)
}

/**
 * 创建住宿标记的SVG图标
 */
export function createAccommodationMarkerIcon(): string {
  const svgIcon = `
    <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-hotel" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="grad-hotel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:0.9" />
        </linearGradient>
      </defs>
      <!-- 标记主体 -->
      <path
        d="M18 2 C10.27 2 4 8.27 4 16 C4 26 18 44 18 44 S32 26 32 16 C32 8.27 25.73 2 18 2 Z"
        fill="url(#grad-hotel)"
        stroke="white"
        stroke-width="2.5"
        filter="url(#shadow-hotel)"
      />
      <!-- 内圆 -->
      <circle cx="18" cy="16" r="9" fill="white" opacity="0.95"/>
      <!-- 酒店图标背景 -->
      <circle cx="18" cy="16" r="8" fill="#dc2626"/>
      <!-- 酒店图标 - 简化的房子 -->
      <text x="18" y="16" text-anchor="middle" dominant-baseline="central"
            fill="white" font-size="16" font-weight="bold" font-family="Arial, sans-serif">
        🏨
      </text>
    </svg>
  `

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon)
}

/**
 * 创建活动信息窗口内容
 */
export function createActivityInfoWindowContent(activity: Activity, dayNumber: number): string {
  const dayColor = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]

  return `
    <div style="padding: 12px; min-width: 250px; max-width: 300px;">
      ${activity.photos && activity.photos.length > 0 ? `
        <img
          src="${activity.photos[0]}"
          alt="${activity.name}"
          style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;"
          onerror="this.style.display='none'"
        />
      ` : ''}
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="background: ${dayColor}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">第${dayNumber}天</span>
        <span style="font-size: 16px;">${getActivityEmoji(activity.type)}</span>
        <h4 style="margin: 0; font-size: 15px; font-weight: bold; flex: 1; color: #1f2937;">${activity.name}</h4>
      </div>
      ${activity.rating ? `
        <div style="color: #f59e0b; font-size: 12px; margin-bottom: 4px;">
          ${'★'.repeat(Math.floor(activity.rating))}${'☆'.repeat(5 - Math.floor(activity.rating))} ${activity.rating.toFixed(1)}
        </div>
      ` : ''}
      <p style="margin: 4px 0; font-size: 12px; color: #666;">${activity.location?.address || ''}</p>
      ${activity.time ? `<p style="margin: 4px 0; font-size: 12px; color: #3b82f6;">⏰ ${activity.time}</p>` : ''}
      ${activity.duration ? `<p style="margin: 4px 0; font-size: 12px; color: #6b7280;">🕐 游玩时长：${activity.duration}</p>` : ''}
      ${activity.ticket_price !== undefined && activity.ticket_price !== null ? `
        <p style="margin: 4px 0; font-size: 12px; color: #10b981; font-weight: 500;">
          💰 门票：${activity.ticket_price === 0 ? '免费' : '¥' + activity.ticket_price}
        </p>
      ` : ''}
      ${activity.description ? `<p style="margin: 8px 0 4px 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${activity.description}</p>` : ''}
      ${activity.tips ? `
        <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
          <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.4;">💡 ${activity.tips}</p>
        </div>
      ` : ''}
    </div>
  `
}

/**
 * 创建住宿信息窗口内容
 */
export function createAccommodationInfoWindowContent(hotel: Accommodation): string {
  return `
    <div style="padding: 12px; min-width: 250px; max-width: 300px;">
      ${hotel.photos && hotel.photos.length > 0 ? `
        <img
          src="${hotel.photos[0]}"
          alt="${hotel.name}"
          style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;"
          onerror="this.style.display='none'"
        />
      ` : ''}
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 18px;">🏨</span>
        <h4 style="margin: 0; font-size: 15px; font-weight: bold; flex: 1; color: #1f2937;">${hotel.name}</h4>
      </div>
      ${hotel.rating ? `
        <div style="color: #f59e0b; font-size: 12px; margin-bottom: 4px;">
          ${'★'.repeat(Math.floor(hotel.rating))}${'☆'.repeat(5 - Math.floor(hotel.rating))} ${hotel.rating.toFixed(1)}
        </div>
      ` : ''}
      <p style="margin: 4px 0; font-size: 12px; color: #666;">${hotel.location?.address || ''}</p>
      <p style="margin: 4px 0; font-size: 12px; color: #3b82f6;">
        📅 ${new Date(hotel.check_in).toLocaleDateString('zh-CN')} - ${new Date(hotel.check_out).toLocaleDateString('zh-CN')}
      </p>
      <p style="margin: 4px 0; font-size: 12px; color: #10b981; font-weight: 500;">
        💰 ¥${hotel.price_per_night}/晚 · 总计 ¥${hotel.total_price}
      </p>
      ${hotel.description ? `<p style="margin: 8px 0 4px 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${hotel.description}</p>` : ''}
    </div>
  `
}
