/**
 * 地理位置聚类工具
 * 用于优化旅行行程，将地理位置相近的景点安排在一起
 */

import { Activity, Meal, Itinerary, DayPlan, Location } from '@/types'

/**
 * 聚类项（活动或餐饮）
 */
interface ClusterItem {
  type: 'activity' | 'meal'
  item: Activity | Meal
  location: Location
  time: string
  originalIndex: number
}

/**
 * 聚类簇
 */
interface Cluster {
  id: number
  items: ClusterItem[]
  center: Location
  radius: number // 簇的最大半径（米）
}

/**
 * 使用 Haversine 公式计算两点间的距离（单位：米）
 * @param lat1 第一个点的纬度
 * @param lng1 第一个点的经度
 * @param lat2 第二个点的纬度
 * @param lng2 第二个点的经度
 * @returns 距离（米）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // 地球半径（米）
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * 检查位置数据是否有效
 */
function isValidLocation(location?: Location): boolean {
  if (!location) return false
  const { lat, lng } = location
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * 将一天的活动和餐饮转换为聚类项列表
 */
function convertToClusterItems(
  activities: Activity[],
  meals: Meal[]
): ClusterItem[] {
  const items: ClusterItem[] = []

  // 添加活动
  activities.forEach((activity, index) => {
    if (isValidLocation(activity.location)) {
      items.push({
        type: 'activity',
        item: activity,
        location: activity.location,
        time: activity.time,
        originalIndex: index,
      })
    }
  })

  // 添加餐饮
  meals.forEach((meal, index) => {
    if (isValidLocation(meal.location)) {
      items.push({
        type: 'meal',
        item: meal,
        location: meal.location,
        time: meal.time,
        originalIndex: index,
      })
    }
  })

  // 按时间排序
  items.sort((a, b) => {
    const timeA = a.time.replace(':', '')
    const timeB = b.time.replace(':', '')
    return timeA.localeCompare(timeB)
  })

  return items
}

/**
 * 计算聚类簇的中心点
 */
function calculateClusterCenter(items: ClusterItem[]): Location {
  if (items.length === 0) {
    return { name: '', address: '', lat: 0, lng: 0 }
  }

  const sumLat = items.reduce((sum, item) => sum + item.location.lat, 0)
  const sumLng = items.reduce((sum, item) => sum + item.location.lng, 0)

  return {
    name: 'Cluster Center',
    address: '',
    lat: sumLat / items.length,
    lng: sumLng / items.length,
  }
}

/**
 * 计算聚类簇的最大半径
 */
function calculateClusterRadius(items: ClusterItem[], center: Location): number {
  if (items.length === 0) return 0

  let maxDistance = 0
  items.forEach(item => {
    const distance = calculateDistance(
      center.lat,
      center.lng,
      item.location.lat,
      item.location.lng
    )
    maxDistance = Math.max(maxDistance, distance)
  })

  return maxDistance
}

/**
 * 使用贪心算法对一天的活动进行地理聚类
 * @param activities 活动列表
 * @param meals 餐饮列表
 * @param maxClusterDistance 聚类的最大距离阈值（米），默认 1000 米
 * @returns 聚类后的簇列表
 */
export function clusterDayActivities(
  activities: Activity[],
  meals: Meal[],
  maxClusterDistance: number = 1000
): Cluster[] {
  const items = convertToClusterItems(activities, meals)

  if (items.length === 0) {
    return []
  }

  const clusters: Cluster[] = []
  const assigned = new Set<number>() // 已分配的项索引

  // 贪心聚类算法
  items.forEach((currentItem, currentIndex) => {
    if (assigned.has(currentIndex)) return

    // 创建新簇
    const clusterItems: ClusterItem[] = [currentItem]
    assigned.add(currentIndex)

    // 查找与当前项距离在阈值内的其他未分配项
    items.forEach((otherItem, otherIndex) => {
      if (assigned.has(otherIndex)) return

      // 计算与当前簇中所有项的最小距离
      const minDistanceToCluster = Math.min(
        ...clusterItems.map(clusterItem =>
          calculateDistance(
            clusterItem.location.lat,
            clusterItem.location.lng,
            otherItem.location.lat,
            otherItem.location.lng
          )
        )
      )

      // 如果距离在阈值内，加入簇
      if (minDistanceToCluster <= maxClusterDistance) {
        clusterItems.push(otherItem)
        assigned.add(otherIndex)
      }
    })

    // 计算簇的中心和半径
    const center = calculateClusterCenter(clusterItems)
    const radius = calculateClusterRadius(clusterItems, center)

    clusters.push({
      id: clusters.length,
      items: clusterItems,
      center,
      radius,
    })
  })

  return clusters
}

/**
 * 将聚类后的数据转换回活动和餐饮列表
 */
function convertClustersToLists(clusters: Cluster[]): {
  activities: Activity[]
  meals: Meal[]
} {
  const activities: Activity[] = []
  const meals: Meal[] = []

  // 按簇顺序遍历（已经是按地理位置优化的顺序）
  clusters.forEach(cluster => {
    // 簇内按时间排序
    cluster.items.sort((a, b) => {
      const timeA = a.time.replace(':', '')
      const timeB = b.time.replace(':', '')
      return timeA.localeCompare(timeB)
    })

    // 分离活动和餐饮
    cluster.items.forEach(item => {
      if (item.type === 'activity') {
        activities.push(item.item as Activity)
      } else {
        meals.push(item.item as Meal)
      }
    })
  })

  return { activities, meals }
}

/**
 * 优化单日行程的景点顺序
 * @param day 单日行程计划
 * @param maxClusterDistance 聚类最大距离（米）
 * @returns 优化后的单日行程
 */
export function optimizeDayPlan(
  day: DayPlan,
  maxClusterDistance: number = 1000
): DayPlan {
  // 如果没有活动或活动太少，不需要优化
  if (!day.activities || day.activities.length <= 1) {
    return day
  }

  // 检查是否有有效的位置数据
  const hasValidLocations = day.activities.some(activity =>
    isValidLocation(activity.location)
  )

  if (!hasValidLocations) {
    console.log(`Day ${day.day} has no valid location data, skipping clustering`)
    return day
  }

  try {
    // 执行聚类
    const clusters = clusterDayActivities(
      day.activities,
      day.meals || [],
      maxClusterDistance
    )

    // 转换回列表
    const { activities, meals } = convertClustersToLists(clusters)

    console.log(
      `Day ${day.day}: Optimized ${day.activities.length} activities into ${clusters.length} clusters`
    )

    return {
      ...day,
      activities,
      meals,
    }
  } catch (error) {
    console.error(`Error clustering day ${day.day}:`, error)
    // 出错时返回原始数据
    return day
  }
}

/**
 * 优化整个行程的所有天
 * @param itinerary 原始行程
 * @param maxClusterDistance 聚类最大距离（米），默认 1000 米
 * @returns 优化后的行程
 */
export function optimizeItineraryByClustering(
  itinerary: Itinerary,
  maxClusterDistance: number = 1000
): Itinerary {
  if (!itinerary.days || itinerary.days.length === 0) {
    return itinerary
  }

  console.log(`Starting clustering optimization for ${itinerary.days.length} days`)

  const optimizedDays = itinerary.days.map(day =>
    optimizeDayPlan(day, maxClusterDistance)
  )

  return {
    ...itinerary,
    days: optimizedDays,
  }
}

/**
 * 分析行程的聚类质量
 * @param itinerary 行程数据
 * @returns 聚类质量报告
 */
export function analyzeClusteringQuality(itinerary: Itinerary): {
  totalDays: number
  daysWithClusters: number
  averageClustersPerDay: number
  averageClusterRadius: number
  recommendations: string[]
} {
  const report = {
    totalDays: itinerary.days.length,
    daysWithClusters: 0,
    averageClustersPerDay: 0,
    averageClusterRadius: 0,
    recommendations: [] as string[],
  }

  let totalClusters = 0
  let totalRadius = 0
  let clusterCount = 0

  itinerary.days.forEach(day => {
    const clusters = clusterDayActivities(day.activities, day.meals || [])
    if (clusters.length > 0) {
      report.daysWithClusters++
      totalClusters += clusters.length
      clusters.forEach(cluster => {
        totalRadius += cluster.radius
        clusterCount++
      })
    }
  })

  if (report.daysWithClusters > 0) {
    report.averageClustersPerDay = totalClusters / report.daysWithClusters
  }

  if (clusterCount > 0) {
    report.averageClusterRadius = totalRadius / clusterCount
  }

  // 生成建议
  if (report.averageClusterRadius > 2000) {
    report.recommendations.push('部分景点分布较分散，建议增加交通时间预留')
  }

  if (report.averageClustersPerDay > 4) {
    report.recommendations.push('每天游览区域较多，建议适当减少景点数量')
  }

  return report
}
