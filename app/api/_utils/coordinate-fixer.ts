/**
 * 坐标修正工具函数
 * 将 AI 生成的 WGS84 坐标转换为高德地图使用的 GCJ-02 坐标
 */

import { smartGeocode } from '@/lib/amap-geocoding'
import { wgs84ToGcj02 } from '@/lib/coordinate-converter'
import { logger } from '@/lib/utils/logger'
import type { Itinerary, Location } from '@/types'

/**
 * 坐标修正配置
 */
interface CoordinateFixerConfig {
  maxApiCalls?: number
  apiDelay?: number
  minOffsetDistance?: number
}

const DEFAULT_CONFIG: Required<CoordinateFixerConfig> = {
  maxApiCalls: 30, // 限制 API 调用次数
  apiDelay: 300, // API 调用延迟（毫秒）
  minOffsetDistance: 10, // 最小偏移距离（米）
}

/**
 * 计算坐标偏移距离（米）
 */
function calculateOffsetDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.sqrt(
    Math.pow((lng2 - lng1) * 111000, 2) +
    Math.pow((lat2 - lat1) * 111000, 2)
  )
}

/**
 * 修正单个位置的坐标
 * 策略：
 * 1. 优先使用高德地图 API 获取准确的 GCJ-02 坐标
 * 2. 如果 API 调用失败，则将 WGS84 坐标转换为 GCJ-02
 */
async function correctSingleLocation(
  location: Location | undefined,
  name: string,
  destination: string,
  apiCallTracker: { count: number },
  config: Required<CoordinateFixerConfig>
): Promise<void> {
  if (!location || !location.lat || !location.lng) {
    return
  }

  const originalLat = location.lat
  const originalLng = location.lng

  // 策略 1: 尝试使用高德地图 API（有次数限制）
  if (apiCallTracker.count < config.maxApiCalls) {
    try {
      // 添加延迟避免 API 限流
      if (apiCallTracker.count > 0) {
        await new Promise(resolve => setTimeout(resolve, config.apiDelay))
      }

      const result = await smartGeocode(name, destination)
      apiCallTracker.count++

      if (result) {
        logger.info(`✓ 坐标修正成功 [${name}]`, {
          from: `(${originalLat}, ${originalLng})`,
          to: `(${result.lat}, ${result.lng})`,
        })

        location.lat = result.lat
        location.lng = result.lng
        if (result.formattedAddress) {
          location.address = result.formattedAddress
        }
        return
      }
    } catch (error) {
      logger.warn(`坐标修正 API 失败 [${name}]，回退到坐标转换`, { error })
    }
  }

  // 策略 2: API 调用失败或超出次数限制，使用坐标转换
  const converted = wgs84ToGcj02(originalLng, originalLat)
  const offsetDistance = calculateOffsetDistance(
    originalLat,
    originalLng,
    converted.lat,
    converted.lng
  )

  // 只有偏移超过阈值才进行转换（避免重复转换已经是 GCJ-02 的坐标）
  if (offsetDistance > config.minOffsetDistance) {
    logger.info(`→ 坐标转换 [${name}]`, {
      from: `(${originalLat}, ${originalLng})`,
      to: `(${converted.lat}, ${converted.lng})`,
      offset: `${offsetDistance.toFixed(2)}m`,
    })

    location.lat = converted.lat
    location.lng = converted.lng
  }
}

/**
 * 修正行程中所有坐标
 * @param itinerary 行程数据
 * @param destination 目的地（用于地理编码）
 * @param config 配置选项
 */
export async function correctItineraryCoordinates(
  itinerary: Itinerary,
  destination: string,
  config: CoordinateFixerConfig = {}
): Promise<Itinerary> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const apiCallTracker = { count: 0 }

  logger.info('开始坐标修正...', { destination })

  // 修正每一天的活动景点坐标
  for (const day of itinerary.days) {
    // 修正活动坐标
    if (day.activities && day.activities.length > 0) {
      for (const activity of day.activities) {
        await correctSingleLocation(
          activity.location,
          activity.name,
          destination,
          apiCallTracker,
          fullConfig
        )
      }
    }

    // 修正餐饮坐标
    if (day.meals && day.meals.length > 0) {
      for (const meal of day.meals) {
        await correctSingleLocation(
          meal.location,
          meal.restaurant,
          destination,
          apiCallTracker,
          fullConfig
        )
      }
    }
  }

  // 修正住宿坐标
  if (itinerary.accommodation && itinerary.accommodation.length > 0) {
    for (const hotel of itinerary.accommodation) {
      await correctSingleLocation(
        hotel.location,
        hotel.name,
        destination,
        apiCallTracker,
        fullConfig
      )
    }
  }

  logger.info('坐标修正完成', {
    apiCallsUsed: `${apiCallTracker.count}/${fullConfig.maxApiCalls}`,
  })

  return itinerary
}
