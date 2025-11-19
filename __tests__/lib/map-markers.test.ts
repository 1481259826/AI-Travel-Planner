/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  calculateMapCenter,
  createMapInfoWindowContent,
  createActivityMarkerIcon,
  createAccommodationMarkerIcon,
  createActivityInfoWindowContent,
  createAccommodationInfoWindowContent,
  type MapLocation,
} from '@/lib/map-markers'
import type { Activity, Accommodation } from '@/types'

describe('map-markers', () => {
  describe('calculateMapCenter', () => {
    it('应该返回默认北京坐标当位置列表为空时', () => {
      const center = calculateMapCenter([])
      expect(center).toEqual({ lat: 39.9042, lng: 116.4074 })
    })

    it('应该返回单个位置的坐标', () => {
      const locations: MapLocation[] = [
        { name: '天安门', lat: 39.9042, lng: 116.4074, type: 'activity' },
      ]
      const center = calculateMapCenter(locations)
      expect(center).toEqual({ lat: 39.9042, lng: 116.4074 })
    })

    it('应该计算多个位置的平均中心点', () => {
      const locations: MapLocation[] = [
        { name: 'A', lat: 0, lng: 0, type: 'activity' },
        { name: 'B', lat: 2, lng: 2, type: 'activity' },
      ]
      const center = calculateMapCenter(locations)
      expect(center).toEqual({ lat: 1, lng: 1 })
    })

    it('应该处理混合类型的位置', () => {
      const locations: MapLocation[] = [
        { name: 'Activity', lat: 39.9, lng: 116.4, type: 'activity' },
        { name: 'Meal', lat: 39.9, lng: 116.4, type: 'meal' },
        { name: 'Hotel', lat: 39.9, lng: 116.4, type: 'hotel' },
      ]
      const center = calculateMapCenter(locations)
      expect(center.lat).toBeCloseTo(39.9, 1)
      expect(center.lng).toBeCloseTo(116.4, 1)
    })
  })

  describe('createMapInfoWindowContent', () => {
    it('应该创建活动的信息窗口内容', () => {
      const location: MapLocation = {
        name: '天安门',
        lat: 39.9042,
        lng: 116.4074,
        type: 'activity',
        time: '09:00',
        description: '参观天安门广场',
      }
      const content = createMapInfoWindowContent(location, 1)

      expect(content).toContain('天安门')
      expect(content).toContain('活动')
      expect(content).toContain('第 1 站')
      expect(content).toContain('09:00')
      expect(content).toContain('参观天安门广场')
      expect(content).toContain('🎯')
    })

    it('应该创建餐饮的信息窗口内容', () => {
      const location: MapLocation = {
        name: '王府井小吃',
        lat: 39.9087,
        lng: 116.4142,
        type: 'meal',
      }
      const content = createMapInfoWindowContent(location, 2)

      expect(content).toContain('王府井小吃')
      expect(content).toContain('餐饮')
      expect(content).toContain('第 2 站')
      expect(content).toContain('🍽️')
    })

    it('应该创建住宿的信息窗口内容', () => {
      const location: MapLocation = {
        name: '北京酒店',
        lat: 39.9,
        lng: 116.4,
        type: 'hotel',
      }
      const content = createMapInfoWindowContent(location, 3)

      expect(content).toContain('北京酒店')
      expect(content).toContain('住宿')
      expect(content).toContain('第 3 站')
      expect(content).toContain('🏨')
    })

    it('应该处理缺少可选字段的位置', () => {
      const location: MapLocation = {
        name: '地点A',
        lat: 0,
        lng: 0,
        type: 'activity',
      }
      const content = createMapInfoWindowContent(location, 1)

      expect(content).toContain('地点A')
      expect(content).not.toContain('⏰')
    })
  })

  describe('createActivityMarkerIcon', () => {
    it('应该返回 SVG data URI', () => {
      const icon = createActivityMarkerIcon(1, 0)
      expect(icon).toMatch(/^data:image\/svg\+xml/)
    })

    it('应该包含正确的序号', () => {
      const icon = createActivityMarkerIcon(1, 2)
      const decoded = decodeURIComponent(icon.replace('data:image/svg+xml;charset=UTF-8,', ''))
      // 检查SVG中包含数字 3 (indexInDay + 1)
      expect(decoded).toMatch(/>\s*3\s*</)
    })

    it('应该使用正确的颜色', () => {
      const icon = createActivityMarkerIcon(1, 0)
      const decoded = decodeURIComponent(icon.replace('data:image/svg+xml;charset=UTF-8,', ''))
      expect(decoded).toContain('#3b82f6') // DAY_COLORS[0]
    })

    it('应该循环使用颜色', () => {
      const icon = createActivityMarkerIcon(9, 0)
      const decoded = decodeURIComponent(icon.replace('data:image/svg+xml;charset=UTF-8,', ''))
      expect(decoded).toContain('#3b82f6') // DAY_COLORS[0]
    })
  })

  describe('createAccommodationMarkerIcon', () => {
    it('应该返回 SVG data URI', () => {
      const icon = createAccommodationMarkerIcon()
      expect(icon).toMatch(/^data:image\/svg\+xml/)
    })

    it('应该包含酒店图标', () => {
      const icon = createAccommodationMarkerIcon()
      const decoded = decodeURIComponent(icon.replace('data:image/svg+xml;charset=UTF-8,', ''))
      expect(decoded).toContain('🏨')
    })

    it('应该使用红色主题', () => {
      const icon = createAccommodationMarkerIcon()
      const decoded = decodeURIComponent(icon.replace('data:image/svg+xml;charset=UTF-8,', ''))
      expect(decoded).toContain('#dc2626')
    })
  })

  describe('createActivityInfoWindowContent', () => {
    it('应该创建基本的活动信息窗口', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '故宫',
        description: '参观故宫博物院',
        location: {
          name: '故宫',
          address: '北京市东城区景山前街4号',
          lat: 39.9163,
          lng: 116.3972,
        },
        duration: 180,
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('故宫')
      expect(content).toContain('参观故宫博物院')
      expect(content).toContain('09:00')
      expect(content).toContain('第1天')
      expect(content).toContain('北京市东城区景山前街4号')
    })

    it('应该显示评分', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '故宫',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 180,
        rating: 4.8,
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('★★★★☆')
      expect(content).toContain('4.8')
    })

    it('应该显示门票价格', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '故宫',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 180,
        ticket_price: 60,
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('门票')
      expect(content).toContain('¥60')
    })

    it('应该显示免费门票', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '天坛公园',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 120,
        ticket_price: 0,
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('免费')
    })

    it('应该显示tips', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '故宫',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 180,
        tips: '建议提前预约',
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('建议提前预约')
      expect(content).toContain('💡')
    })

    it('应该处理照片', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '故宫',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 180,
        photos: ['https://example.com/photo.jpg'],
      }
      const content = createActivityInfoWindowContent(activity, 1)

      expect(content).toContain('https://example.com/photo.jpg')
      expect(content).toContain('<img')
    })
  })

  describe('createAccommodationInfoWindowContent', () => {
    it('应该创建基本的住宿信息窗口', () => {
      const hotel: Accommodation = {
        name: '北京酒店',
        type: 'hotel',
        address: '北京市朝阳区',
        location: {
          name: '北京酒店',
          address: '北京市朝阳区',
          lat: 39.9,
          lng: 116.4,
        },
        check_in: '2025-01-20',
        check_out: '2025-01-22',
        price_per_night: 500,
        total_price: 1000,
      }
      const content = createAccommodationInfoWindowContent(hotel)

      expect(content).toContain('北京酒店')
      expect(content).toContain('北京市朝阳区')
      expect(content).toContain('¥500/晚')
      expect(content).toContain('¥1000')
      expect(content).toContain('🏨')
    })

    it('应该显示评分', () => {
      const hotel: Accommodation = {
        name: '北京酒店',
        type: 'hotel',
        address: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        check_in: '2025-01-20',
        check_out: '2025-01-22',
        price_per_night: 500,
        total_price: 1000,
        rating: 4.5,
      }
      const content = createAccommodationInfoWindowContent(hotel)

      expect(content).toContain('★★★★☆')
      expect(content).toContain('4.5')
    })

    it('应该显示描述', () => {
      const hotel: Accommodation = {
        name: '北京酒店',
        type: 'hotel',
        address: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        check_in: '2025-01-20',
        check_out: '2025-01-22',
        price_per_night: 500,
        total_price: 1000,
        description: '位于市中心，交通便利',
      }
      const content = createAccommodationInfoWindowContent(hotel)

      expect(content).toContain('位于市中心，交通便利')
    })

    it('应该处理照片', () => {
      const hotel: Accommodation = {
        name: '北京酒店',
        type: 'hotel',
        address: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        check_in: '2025-01-20',
        check_out: '2025-01-22',
        price_per_night: 500,
        total_price: 1000,
        photos: ['https://example.com/hotel.jpg'],
      }
      const content = createAccommodationInfoWindowContent(hotel)

      expect(content).toContain('https://example.com/hotel.jpg')
      expect(content).toContain('<img')
    })
  })
})
