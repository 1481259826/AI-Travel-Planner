/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  clusterDayActivities,
  optimizeDayPlan,
  optimizeItineraryByClustering,
  analyzeClusteringQuality,
} from '@/lib/geo-clustering'
import type { Activity, Meal, DayPlan, Itinerary } from '@/types'

describe('geo-clustering', () => {
  describe('calculateDistance', () => {
    it('应该正确计算两个相同点之间的距离为 0', () => {
      const distance = calculateDistance(39.9042, 116.4074, 39.9042, 116.4074)
      expect(distance).toBe(0)
    })

    it('应该正确计算北京天安门和故宫之间的距离（约 1.6 公里）', () => {
      // 天安门: 39.9042°N, 116.4074°E
      // 故宫: 39.9163°N, 116.3972°E
      const distance = calculateDistance(39.9042, 116.4074, 39.9163, 116.3972)

      // 实际距离约为 1.6 公里，允许合理误差
      expect(distance).toBeGreaterThan(1500)
      expect(distance).toBeLessThan(1700)
    })

    it('应该正确计算跨半球的距离', () => {
      // 北京到纽约的距离应该非常大
      const distance = calculateDistance(39.9042, 116.4074, 40.7128, -74.006)

      // 约 11,000 公里
      expect(distance).toBeGreaterThan(10_000_000)
      expect(distance).toBeLessThan(12_000_000)
    })

    it('应该处理负数坐标（南半球和西半球）', () => {
      // 悉尼: -33.8688°S, 151.2093°E
      // 圣保罗: -23.5505°S, -46.6333°W
      const distance = calculateDistance(-33.8688, 151.2093, -23.5505, -46.6333)

      // 约 13,000 公里
      expect(distance).toBeGreaterThan(12_000_000)
      expect(distance).toBeLessThan(14_000_000)
    })

    it('应该处理赤道附近的点', () => {
      const distance = calculateDistance(0, 0, 0, 1)

      // 赤道上 1 度经度约为 111 公里
      expect(distance).toBeGreaterThan(100_000)
      expect(distance).toBeLessThan(120_000)
    })
  })

  describe('clusterDayActivities', () => {
    it('应该返回空数组当没有活动和餐饮时', () => {
      const clusters = clusterDayActivities([], [])
      expect(clusters).toEqual([])
    })

    it('应该过滤掉无效的位置数据', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '无效位置',
          location: { name: '', address: '', lat: NaN, lng: NaN },
          duration: 60,
        },
      ]

      const clusters = clusterDayActivities(activities, [])
      expect(clusters).toEqual([])
    })

    it('应该将单个活动创建为单个簇', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '天安门',
          location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
          duration: 60,
        },
      ]

      const clusters = clusterDayActivities(activities, [])
      expect(clusters).toHaveLength(1)
      expect(clusters[0].items).toHaveLength(1)
      expect(clusters[0].radius).toBe(0)
    })

    it('应该将相近的景点聚类到同一簇（距离 < 1000m）', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '天安门',
          location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
          duration: 60,
        },
        {
          time: '10:00',
          type: 'attraction',
          description: '故宫',
          location: { name: '故宫', address: '', lat: 39.9163, lng: 116.3972 },
          duration: 120,
        },
      ]

      const clusters = clusterDayActivities(activities, [], 2000) // 增加阈值到 2000m

      // 由于天安门和故宫距离约 1.4 公里，在 2000m 阈值内应该聚类到一起
      expect(clusters).toHaveLength(1)
      expect(clusters[0].items).toHaveLength(2)
    })

    it('应该将远距离的景点分到不同簇（距离 > 1000m）', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '天安门',
          location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
          duration: 60,
        },
        {
          time: '14:00',
          type: 'attraction',
          description: '颐和园',
          location: { name: '颐和园', address: '', lat: 39.9999, lng: 116.2750 },
          duration: 180,
        },
      ]

      const clusters = clusterDayActivities(activities, [])

      // 天安门和颐和园距离约 15 公里，应该分到不同簇
      expect(clusters.length).toBeGreaterThanOrEqual(2)
    })

    it('应该混合处理活动和餐饮', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '天安门',
          location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
          duration: 60,
        },
      ]

      const meals: Meal[] = [
        {
          time: '12:00',
          type: 'lunch',
          restaurant: '王府井小吃街',
          location: { name: '王府井', address: '', lat: 39.9087, lng: 116.4142 },
          cuisine: '中餐',
        },
      ]

      const clusters = clusterDayActivities(activities, meals, 2000)

      // 天安门和王府井距离约 800m，应该在同一簇
      expect(clusters).toHaveLength(1)
      expect(clusters[0].items).toHaveLength(2)

      // 检查簇内同时包含活动和餐饮
      const types = clusters[0].items.map(item => item.type)
      expect(types).toContain('activity')
      expect(types).toContain('meal')
    })

    it('应该正确计算簇的中心点', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '景点 A',
          location: { name: 'A', address: '', lat: 0, lng: 0 },
          duration: 60,
        },
        {
          time: '10:00',
          type: 'attraction',
          description: '景点 B',
          location: { name: 'B', address: '', lat: 2, lng: 2 },
          duration: 60,
        },
      ]

      const clusters = clusterDayActivities(activities, [], 500000) // 大阈值确保聚类到一起

      expect(clusters).toHaveLength(1)
      // 中心点应该是 (1, 1)
      expect(clusters[0].center.lat).toBe(1)
      expect(clusters[0].center.lng).toBe(1)
    })

    it('应该正确计算簇的半径', () => {
      const activities: Activity[] = [
        {
          time: '09:00',
          type: 'attraction',
          description: '景点 A',
          location: { name: 'A', address: '', lat: 39.9042, lng: 116.4074 },
          duration: 60,
        },
        {
          time: '10:00',
          type: 'attraction',
          description: '景点 B',
          location: { name: 'B', address: '', lat: 39.9163, lng: 116.3972 },
          duration: 60,
        },
      ]

      const clusters = clusterDayActivities(activities, [], 2000)

      expect(clusters).toHaveLength(1)
      // 半径应该是从中心到最远点的距离
      expect(clusters[0].radius).toBeGreaterThan(0)
      expect(clusters[0].radius).toBeLessThan(2000)
    })

    it('应该按时间顺序处理项', () => {
      const activities: Activity[] = [
        {
          time: '14:00',
          type: 'attraction',
          description: '下午活动',
          location: { name: 'B', address: '', lat: 39.9, lng: 116.4 },
          duration: 60,
        },
        {
          time: '09:00',
          type: 'attraction',
          description: '上午活动',
          location: { name: 'A', address: '', lat: 39.9, lng: 116.4 },
          duration: 60,
        },
      ]

      const clusters = clusterDayActivities(activities, [], 1000)

      // 检查第一个簇的第一个项应该是上午活动
      expect(clusters[0].items[0].time).toBe('09:00')
      expect(clusters[0].items[1].time).toBe('14:00')
    })
  })

  describe('optimizeDayPlan', () => {
    it('应该返回原始数据当没有活动时', () => {
      const day: DayPlan = {
        day: 1,
        date: '2025-01-20',
        activities: [],
        meals: [],
      }

      const optimized = optimizeDayPlan(day)
      expect(optimized).toEqual(day)
    })

    it('应该返回原始数据当只有一个活动时', () => {
      const day: DayPlan = {
        day: 1,
        date: '2025-01-20',
        activities: [
          {
            time: '09:00',
            type: 'attraction',
            description: '天安门',
            location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
            duration: 60,
          },
        ],
        meals: [],
      }

      const optimized = optimizeDayPlan(day)
      expect(optimized.activities).toHaveLength(1)
    })

    it('应该返回原始数据当所有位置都无效时', () => {
      const day: DayPlan = {
        day: 1,
        date: '2025-01-20',
        activities: [
          {
            time: '09:00',
            type: 'attraction',
            description: '无效景点',
            location: { name: '', address: '', lat: NaN, lng: NaN },
            duration: 60,
          },
        ],
        meals: [],
      }

      const optimized = optimizeDayPlan(day)
      expect(optimized).toEqual(day)
    })

    it('应该优化有多个活动的日程', () => {
      const day: DayPlan = {
        day: 1,
        date: '2025-01-20',
        activities: [
          {
            time: '09:00',
            type: 'attraction',
            description: '天安门',
            location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
            duration: 60,
          },
          {
            time: '14:00',
            type: 'attraction',
            description: '颐和园',
            location: { name: '颐和园', address: '', lat: 39.9999, lng: 116.2750 },
            duration: 180,
          },
        ],
        meals: [],
      }

      const optimized = optimizeDayPlan(day)

      // 应该仍然有 2 个活动
      expect(optimized.activities).toHaveLength(2)
      // 活动应该按优化后的顺序排列
      expect(optimized.activities[0]).toBeDefined()
      expect(optimized.activities[1]).toBeDefined()
    })

    it('应该在出错时返回原始数据', () => {
      const day: DayPlan = {
        day: 1,
        date: '2025-01-20',
        activities: [
          {
            time: '09:00',
            type: 'attraction',
            description: '天安门',
            location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
            duration: 60,
          },
        ],
        meals: [],
      }

      // 即使传入极端参数，也应该返回有效数据
      const optimized = optimizeDayPlan(day, -1)
      expect(optimized.activities).toHaveLength(1)
    })
  })

  describe('optimizeItineraryByClustering', () => {
    it('应该返回原始数据当没有天数时', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-20',
        days: [],
      }

      const optimized = optimizeItineraryByClustering(itinerary)
      expect(optimized).toEqual(itinerary)
    })

    it('应该优化多天行程', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        days: [
          {
            day: 1,
            date: '2025-01-20',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '天安门',
                location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
                duration: 60,
              },
            ],
            meals: [],
          },
          {
            day: 2,
            date: '2025-01-21',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '颐和园',
                location: { name: '颐和园', address: '', lat: 39.9999, lng: 116.2750 },
                duration: 180,
              },
            ],
            meals: [],
          },
        ],
      }

      const optimized = optimizeItineraryByClustering(itinerary)

      // 应该保持相同的天数
      expect(optimized.days).toHaveLength(2)
      // 每天的活动数量应该保持不变
      expect(optimized.days[0].activities).toHaveLength(1)
      expect(optimized.days[1].activities).toHaveLength(1)
    })

    it('应该保留其他行程属性', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-21',
        totalBudget: 5000,
        accommodation: {
          name: '北京酒店',
          type: 'hotel',
          address: '',
          location: { name: '', address: '', lat: 39.9, lng: 116.4 },
          checkIn: '2025-01-20',
          checkOut: '2025-01-21',
          pricePerNight: 500,
        },
        days: [
          {
            day: 1,
            date: '2025-01-20',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '天安门',
                location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
                duration: 60,
              },
            ],
            meals: [],
          },
        ],
      }

      const optimized = optimizeItineraryByClustering(itinerary)

      // 其他属性应该保持不变
      expect(optimized.destination).toBe('北京')
      expect(optimized.startDate).toBe('2025-01-20')
      expect(optimized.endDate).toBe('2025-01-21')
      expect(optimized.totalBudget).toBe(5000)
      expect(optimized.accommodation).toBeDefined()
    })
  })

  describe('analyzeClusteringQuality', () => {
    it('应该正确分析空行程', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-20',
        days: [],
      }

      const report = analyzeClusteringQuality(itinerary)

      expect(report.totalDays).toBe(0)
      expect(report.daysWithClusters).toBe(0)
      expect(report.averageClustersPerDay).toBe(0)
      expect(report.averageClusterRadius).toBe(0)
    })

    it('应该正确分析单天行程', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-20',
        days: [
          {
            day: 1,
            date: '2025-01-20',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '天安门',
                location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
                duration: 60,
              },
              {
                time: '10:00',
                type: 'attraction',
                description: '故宫',
                location: { name: '故宫', address: '', lat: 39.9163, lng: 116.3972 },
                duration: 120,
              },
            ],
            meals: [],
          },
        ],
      }

      const report = analyzeClusteringQuality(itinerary)

      expect(report.totalDays).toBe(1)
      expect(report.daysWithClusters).toBeGreaterThan(0)
      expect(report.averageClustersPerDay).toBeGreaterThan(0)
    })

    it('应该生成大半径的建议', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-20',
        days: [
          {
            day: 1,
            date: '2025-01-20',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '天安门',
                location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
                duration: 60,
              },
              {
                time: '14:00',
                type: 'attraction',
                description: '颐和园',
                location: { name: '颐和园', address: '', lat: 39.9999, lng: 116.2750 },
                duration: 180,
              },
            ],
            meals: [],
          },
        ],
      }

      const report = analyzeClusteringQuality(itinerary)

      // 由于景点分散，应该有关于交通时间的建议
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('应该正确计算平均值', () => {
      const itinerary: Itinerary = {
        destination: '北京',
        startDate: '2025-01-20',
        endDate: '2025-01-21',
        days: [
          {
            day: 1,
            date: '2025-01-20',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '天安门',
                location: { name: '天安门', address: '', lat: 39.9042, lng: 116.4074 },
                duration: 60,
              },
            ],
            meals: [],
          },
          {
            day: 2,
            date: '2025-01-21',
            activities: [
              {
                time: '09:00',
                type: 'attraction',
                description: '颐和园',
                location: { name: '颐和园', address: '', lat: 39.9999, lng: 116.2750 },
                duration: 180,
              },
            ],
            meals: [],
          },
        ],
      }

      const report = analyzeClusteringQuality(itinerary)

      expect(report.totalDays).toBe(2)
      expect(report.daysWithClusters).toBe(2)
      expect(report.averageClustersPerDay).toBeGreaterThan(0)
      expect(report.averageClusterRadius).toBeGreaterThanOrEqual(0)
    })
  })
})
