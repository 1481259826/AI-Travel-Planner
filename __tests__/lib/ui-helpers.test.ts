/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  DAY_COLORS,
  getDayColor,
  ACTIVITY_TYPE_EMOJI,
  getActivityEmoji,
  ACTIVITY_TYPE_STYLES,
  getActivityTypeStyle,
  ACCOMMODATION_TYPE_STYLES,
  getAccommodationTypeStyle,
  TRANSPORTATION_KEYWORDS,
  isTransportationActivity,
  renderStars,
  formatCurrency,
  formatDate,
  formatDateRange,
  getDaysDiff,
} from '@/lib/ui-helpers'
import type { Activity } from '@/types'

describe('ui-helpers', () => {
  describe('DAY_COLORS', () => {
    it('应该有 8 种颜色', () => {
      expect(DAY_COLORS).toHaveLength(8)
    })

    it('每种颜色应该是有效的十六进制颜色代码', () => {
      DAY_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('getDayColor', () => {
    it('应该返回第一天的颜色', () => {
      expect(getDayColor(1)).toBe(DAY_COLORS[0])
    })

    it('应该返回最后一天的颜色', () => {
      expect(getDayColor(8)).toBe(DAY_COLORS[7])
    })

    it('应该循环使用颜色（第9天使用第1天的颜色）', () => {
      expect(getDayColor(9)).toBe(DAY_COLORS[0])
      expect(getDayColor(10)).toBe(DAY_COLORS[1])
      expect(getDayColor(16)).toBe(DAY_COLORS[7])
      expect(getDayColor(17)).toBe(DAY_COLORS[0])
    })

    it('应该处理大天数', () => {
      expect(getDayColor(100)).toBe(DAY_COLORS[(100 - 1) % 8])
      expect(getDayColor(365)).toBe(DAY_COLORS[(365 - 1) % 8])
    })
  })

  describe('ACTIVITY_TYPE_EMOJI', () => {
    it('应该包含所有活动类型的 emoji', () => {
      expect(ACTIVITY_TYPE_EMOJI.attraction).toBe('🎯')
      expect(ACTIVITY_TYPE_EMOJI.shopping).toBe('🛍️')
      expect(ACTIVITY_TYPE_EMOJI.entertainment).toBe('🎭')
      expect(ACTIVITY_TYPE_EMOJI.relaxation).toBe('🧘')
      expect(ACTIVITY_TYPE_EMOJI.sightseeing).toBe('🏛️')
      expect(ACTIVITY_TYPE_EMOJI.museum).toBe('🖼️')
      expect(ACTIVITY_TYPE_EMOJI.adventure).toBe('⛰️')
      expect(ACTIVITY_TYPE_EMOJI.dining).toBe('🍽️')
      expect(ACTIVITY_TYPE_EMOJI.other).toBe('📍')
    })
  })

  describe('getActivityEmoji', () => {
    it('应该返回正确的 emoji', () => {
      expect(getActivityEmoji('attraction')).toBe('🎯')
      expect(getActivityEmoji('shopping')).toBe('🛍️')
      expect(getActivityEmoji('entertainment')).toBe('🎭')
    })

    it('应该对未知类型返回 other 的 emoji', () => {
      // @ts-expect-error 测试无效类型
      expect(getActivityEmoji('unknown')).toBe('📍')
      // @ts-expect-error 测试无效类型
      expect(getActivityEmoji('')).toBe('📍')
    })
  })

  describe('ACTIVITY_TYPE_STYLES', () => {
    it('应该包含 emoji 和 color 属性', () => {
      Object.values(ACTIVITY_TYPE_STYLES).forEach(style => {
        expect(style).toHaveProperty('emoji')
        expect(style).toHaveProperty('color')
        expect(typeof style.emoji).toBe('string')
        expect(typeof style.color).toBe('string')
      })
    })
  })

  describe('getActivityTypeStyle', () => {
    it('应该返回正确的样式', () => {
      const style = getActivityTypeStyle('attraction')
      expect(style).toHaveProperty('emoji', '🎯')
      expect(style).toHaveProperty('color')
      expect(style.color).toContain('bg-blue-50')
    })

    it('应该对未知类型返回默认样式', () => {
      // @ts-expect-error 测试无效类型
      const style = getActivityTypeStyle('unknown')
      expect(style).toEqual(ACTIVITY_TYPE_STYLES.attraction)
    })
  })

  describe('ACCOMMODATION_TYPE_STYLES', () => {
    it('应该包含所有住宿类型', () => {
      expect(ACCOMMODATION_TYPE_STYLES.hotel).toBeDefined()
      expect(ACCOMMODATION_TYPE_STYLES.hostel).toBeDefined()
      expect(ACCOMMODATION_TYPE_STYLES.apartment).toBeDefined()
      expect(ACCOMMODATION_TYPE_STYLES.resort).toBeDefined()
      expect(ACCOMMODATION_TYPE_STYLES.guesthouse).toBeDefined()
      expect(ACCOMMODATION_TYPE_STYLES.other).toBeDefined()
    })

    it('每种类型应该包含 emoji, label 和 color', () => {
      Object.values(ACCOMMODATION_TYPE_STYLES).forEach(style => {
        expect(style).toHaveProperty('emoji')
        expect(style).toHaveProperty('label')
        expect(style).toHaveProperty('color')
      })
    })
  })

  describe('getAccommodationTypeStyle', () => {
    it('应该返回正确的样式', () => {
      const style = getAccommodationTypeStyle('hotel')
      expect(style.emoji).toBe('🏨')
      expect(style.label).toBe('酒店')
      expect(style.color).toContain('bg-blue-50')
    })

    it('应该对未知类型返回默认样式', () => {
      // @ts-expect-error 测试无效类型
      const style = getAccommodationTypeStyle('unknown')
      expect(style).toEqual(ACCOMMODATION_TYPE_STYLES.hotel)
    })
  })

  describe('TRANSPORTATION_KEYWORDS', () => {
    it('应该包含常见的交通关键词', () => {
      expect(TRANSPORTATION_KEYWORDS).toContain('站')
      expect(TRANSPORTATION_KEYWORDS).toContain('机场')
      expect(TRANSPORTATION_KEYWORDS).toContain('火车站')
      expect(TRANSPORTATION_KEYWORDS).toContain('地铁')
      expect(TRANSPORTATION_KEYWORDS).toContain('station')
      expect(TRANSPORTATION_KEYWORDS).toContain('airport')
    })
  })

  describe('isTransportationActivity', () => {
    it('应该识别包含交通关键词的活动', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'other',
        name: '前往北京站',
        description: '乘坐地铁',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 30,
      }
      expect(isTransportationActivity(activity)).toBe(true)
    })

    it('应该识别英文交通关键词', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'other',
        name: 'Beijing Railway Station',
        description: '',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 30,
      }
      expect(isTransportationActivity(activity)).toBe(true)
    })

    it('应该对非交通活动返回 false', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        name: '天安门广场',
        description: '参观游览',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 60,
      }
      expect(isTransportationActivity(activity)).toBe(false)
    })

    it('应该忽略大小写', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'other',
        name: 'AIRPORT',
        description: 'STATION',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 30,
      }
      expect(isTransportationActivity(activity)).toBe(true)
    })

    it('应该处理没有 name 和 description 的活动', () => {
      const activity: Activity = {
        time: '09:00',
        type: 'attraction',
        description: '景点',
        location: { name: '', address: '', lat: 0, lng: 0 },
        duration: 60,
      }
      expect(isTransportationActivity(activity)).toBe(false)
    })
  })

  describe('renderStars', () => {
    it('应该渲染 5 个星星', () => {
      const stars = renderStars(0)
      expect(stars).toHaveLength(5)
    })

    it('应该正确渲染全星', () => {
      const stars = renderStars(5)
      expect(stars.every(star => star.type === 'full')).toBe(true)
    })

    it('应该正确渲染空星', () => {
      const stars = renderStars(0)
      expect(stars.every(star => star.type === 'empty')).toBe(true)
    })

    it('应该正确渲染半星', () => {
      const stars = renderStars(3.5)
      expect(stars[0].type).toBe('full')
      expect(stars[1].type).toBe('full')
      expect(stars[2].type).toBe('full')
      expect(stars[3].type).toBe('half')
      expect(stars[4].type).toBe('empty')
    })

    it('应该正确处理小数评分（≥ 0.5 算半星）', () => {
      const stars1 = renderStars(3.4)
      expect(stars1[3].type).toBe('empty') // 0.4 < 0.5

      const stars2 = renderStars(3.5)
      expect(stars2[3].type).toBe('half') // 0.5 = 0.5

      const stars3 = renderStars(3.8)
      expect(stars3[3].type).toBe('half') // 0.8 ≥ 0.5
    })

    it('每个星星应该有唯一的 key', () => {
      const stars = renderStars(3.5)
      const keys = stars.map(star => star.key)
      expect(new Set(keys).size).toBe(5)
      expect(keys).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('formatCurrency', () => {
    it('应该格式化人民币', () => {
      const formatted = formatCurrency(1000)
      expect(formatted).toContain('1,000')
      expect(formatted).toContain('¥')
    })

    it('应该处理小数', () => {
      const formatted = formatCurrency(1234.56)
      expect(formatted).toContain('1,234.56')
    })

    it('应该支持其他货币', () => {
      const usd = formatCurrency(1000, 'USD')
      expect(usd).toContain('1,000')
      // USD 在中文环境可能显示为 US$ 或 $
    })

    it('应该处理 0', () => {
      const formatted = formatCurrency(0)
      expect(formatted).toContain('0')
    })

    it('应该处理负数', () => {
      const formatted = formatCurrency(-500)
      expect(formatted).toContain('500')
      expect(formatted).toContain('-')
    })
  })

  describe('formatDate', () => {
    it('应该格式化日期字符串（short）', () => {
      const formatted = formatDate('2025-01-20', 'short')
      expect(formatted).toContain('2025')
      expect(formatted).toContain('1')
      expect(formatted).toContain('20')
    })

    it('应该格式化日期字符串（long）', () => {
      const formatted = formatDate('2025-01-20', 'long')
      expect(formatted).toContain('2025')
      expect(formatted).toContain('1月') // 中文月份
      expect(formatted).toContain('20')
    })

    it('应该格式化日期字符串（numeric）', () => {
      const formatted = formatDate('2025-01-20', 'numeric')
      expect(formatted).toBe('2025-01-20')
    })

    it('应该格式化 Date 对象', () => {
      const date = new Date(2025, 0, 20) // 月份从 0 开始
      const formatted = formatDate(date, 'numeric')
      expect(formatted).toBe('2025-01-20')
    })

    it('应该默认使用 short 格式', () => {
      const formatted = formatDate('2025-01-20')
      expect(formatted).toContain('2025')
    })

    it('应该正确补零', () => {
      const formatted = formatDate('2025-01-05', 'numeric')
      expect(formatted).toBe('2025-01-05')
    })
  })

  describe('formatDateRange', () => {
    it('应该格式化日期范围', () => {
      const range = formatDateRange('2025-01-20', '2025-01-22')
      expect(range).toBe('2025-01-20 至 2025-01-22')
    })

    it('应该处理 Date 对象', () => {
      const start = new Date(2025, 0, 20)
      const end = new Date(2025, 0, 22)
      const range = formatDateRange(start, end)
      expect(range).toBe('2025-01-20 至 2025-01-22')
    })

    it('应该处理跨月的日期范围', () => {
      const range = formatDateRange('2025-01-25', '2025-02-05')
      expect(range).toBe('2025-01-25 至 2025-02-05')
    })

    it('应该处理跨年的日期范围', () => {
      const range = formatDateRange('2024-12-28', '2025-01-05')
      expect(range).toBe('2024-12-28 至 2025-01-05')
    })
  })

  describe('getDaysDiff', () => {
    it('应该计算天数差', () => {
      const diff = getDaysDiff('2025-01-20', '2025-01-22')
      expect(diff).toBe(2)
    })

    it('应该处理 Date 对象', () => {
      const start = new Date(2025, 0, 20)
      const end = new Date(2025, 0, 22)
      const diff = getDaysDiff(start, end)
      expect(diff).toBe(2)
    })

    it('应该处理相同日期', () => {
      const diff = getDaysDiff('2025-01-20', '2025-01-20')
      expect(diff).toBe(0)
    })

    it('应该处理跨月的天数差', () => {
      const diff = getDaysDiff('2025-01-25', '2025-02-05')
      expect(diff).toBe(11)
    })

    it('应该处理跨年的天数差', () => {
      const diff = getDaysDiff('2024-12-28', '2025-01-05')
      expect(diff).toBe(8)
    })

    it('应该向上取整（使用 Math.ceil）', () => {
      // 小于 24 小时也算 1 天
      const start = new Date('2025-01-20T12:00:00')
      const end = new Date('2025-01-20T18:00:00')
      const diff = getDaysDiff(start, end)
      expect(diff).toBe(1)
    })

    it('应该处理大的天数差', () => {
      const diff = getDaysDiff('2025-01-01', '2025-12-31')
      expect(diff).toBe(364)
    })

    it('应该处理负数（结束日期早于开始日期）', () => {
      const diff = getDaysDiff('2025-01-22', '2025-01-20')
      expect(diff).toBe(-2)
    })
  })
})
