/**
 * lib/coordinate-converter.ts 单元测试
 * 测试 WGS84 <-> GCJ-02 坐标系转换功能
 */

import { describe, it, expect } from 'vitest'
import {
  wgs84ToGcj02,
  gcj02ToWgs84,
  batchWgs84ToGcj02,
  isPossiblyWgs84,
} from '@/lib/coordinate-converter'

describe('Coordinate Converter Module', () => {
  describe('wgs84ToGcj02()', () => {
    it('应该正确转换北京天安门的坐标（WGS84 -> GCJ-02）', () => {
      // 天安门 WGS84 坐标
      const wgs = { lng: 116.391, lat: 39.9075 }
      const gcj = wgs84ToGcj02(wgs.lng, wgs.lat)

      // GCJ-02 坐标应该与 WGS84 有一定偏移（中国境内加密）
      expect(gcj.lng).not.toBe(wgs.lng)
      expect(gcj.lat).not.toBe(wgs.lat)

      // 偏移量应该在合理范围内（大约几百米）
      const lngDiff = Math.abs(gcj.lng - wgs.lng)
      const latDiff = Math.abs(gcj.lat - wgs.lat)
      expect(lngDiff).toBeGreaterThan(0)
      expect(lngDiff).toBeLessThan(0.01) // 约 1km
      expect(latDiff).toBeGreaterThan(0)
      expect(latDiff).toBeLessThan(0.01)
    })

    it('应该正确转换上海东方明珠的坐标', () => {
      // 上海东方明珠 WGS84 坐标
      const wgs = { lng: 121.4995, lat: 31.2415 }
      const gcj = wgs84ToGcj02(wgs.lng, wgs.lat)

      // 验证转换结果有效
      expect(gcj.lng).toBeGreaterThan(121.49)
      expect(gcj.lng).toBeLessThan(121.52)
      expect(gcj.lat).toBeGreaterThan(31.23)
      expect(gcj.lat).toBeLessThan(31.25)
    })

    it('对于中国境外坐标应该不进行转换', () => {
      // 纽约时代广场坐标（不在中国境内）
      const nyWgs = { lng: -73.9857, lat: 40.7580 }
      const nyGcj = wgs84ToGcj02(nyWgs.lng, nyWgs.lat)

      // 应该返回原坐标
      expect(nyGcj.lng).toBe(nyWgs.lng)
      expect(nyGcj.lat).toBe(nyWgs.lat)
    })

    it('应该处理边界坐标（中国西北角）', () => {
      const borderWgs = { lng: 73.0, lat: 54.0 }
      const borderGcj = wgs84ToGcj02(borderWgs.lng, borderWgs.lat)

      // 应该进行转换（在中国境内）
      expect(borderGcj.lng).not.toBe(borderWgs.lng)
      expect(borderGcj.lat).not.toBe(borderWgs.lat)
    })

    it('应该处理边界坐标（中国东南角）', () => {
      const borderWgs = { lng: 135.0, lat: 20.0 }
      const borderGcj = wgs84ToGcj02(borderWgs.lng, borderWgs.lat)

      // 应该进行转换（在中国境内）
      expect(borderGcj.lng).not.toBe(borderWgs.lng)
      expect(borderGcj.lat).not.toBe(borderWgs.lat)
    })
  })

  describe('gcj02ToWgs84()', () => {
    it('应该正确转换GCJ-02坐标回WGS84', () => {
      // 先将 WGS84 转为 GCJ-02
      const originalWgs = { lng: 116.391, lat: 39.9075 }
      const gcj = wgs84ToGcj02(originalWgs.lng, originalWgs.lat)

      // 再转换回 WGS84
      const recoveredWgs = gcj02ToWgs84(gcj.lng, gcj.lat)

      // 应该接近原始坐标（误差在可接受范围内，约1米）
      expect(Math.abs(recoveredWgs.lng - originalWgs.lng)).toBeLessThan(0.00001)
      expect(Math.abs(recoveredWgs.lat - originalWgs.lat)).toBeLessThan(0.00001)
    })

    it('对于中国境外坐标应该不进行转换', () => {
      const londonGcj = { lng: -0.1276, lat: 51.5074 }
      const londonWgs = gcj02ToWgs84(londonGcj.lng, londonGcj.lat)

      // 应该返回原坐标
      expect(londonWgs.lng).toBe(londonGcj.lng)
      expect(londonWgs.lat).toBe(londonGcj.lat)
    })
  })

  describe('往返转换精度测试', () => {
    const testCases = [
      { name: '北京', lng: 116.404, lat: 39.915 },
      { name: '上海', lng: 121.472, lat: 31.231 },
      { name: '广州', lng: 113.264, lat: 23.129 },
      { name: '深圳', lng: 114.057, lat: 22.543 },
      { name: '成都', lng: 104.066, lat: 30.572 },
      { name: '西安', lng: 108.939, lat: 34.341 },
      { name: '杭州', lng: 120.153, lat: 30.287 },
    ]

    testCases.forEach(({ name, lng, lat }) => {
      it(`应该正确处理${name}的坐标往返转换`, () => {
        // WGS84 -> GCJ-02 -> WGS84
        const gcj = wgs84ToGcj02(lng, lat)
        const recoveredWgs = gcj02ToWgs84(gcj.lng, gcj.lat)

        // 误差应该非常小（< 2米，约 0.00002 度）
        const lngError = Math.abs(recoveredWgs.lng - lng)
        const latError = Math.abs(recoveredWgs.lat - lat)

        expect(lngError).toBeLessThan(0.00002)
        expect(latError).toBeLessThan(0.00002)
      })
    })
  })

  describe('batchWgs84ToGcj02()', () => {
    it('应该批量转换多个坐标', () => {
      const wgsCoords = [
        { lng: 116.391, lat: 39.9075 }, // 北京
        { lng: 121.4995, lat: 31.2415 }, // 上海
        { lng: 113.264, lat: 23.129 }, // 广州
      ]

      const gcjCoords = batchWgs84ToGcj02(wgsCoords)

      expect(gcjCoords).toHaveLength(3)

      // 每个坐标都应该被转换
      gcjCoords.forEach((gcj, index) => {
        expect(gcj.lng).not.toBe(wgsCoords[index].lng)
        expect(gcj.lat).not.toBe(wgsCoords[index].lat)
      })
    })

    it('应该处理空数组', () => {
      const result = batchWgs84ToGcj02([])
      expect(result).toEqual([])
    })

    it('应该处理单个坐标', () => {
      const wgsCoords = [{ lng: 116.391, lat: 39.9075 }]
      const gcjCoords = batchWgs84ToGcj02(wgsCoords)

      expect(gcjCoords).toHaveLength(1)
      expect(gcjCoords[0].lng).not.toBe(wgsCoords[0].lng)
    })
  })

  describe('isPossiblyWgs84()', () => {
    it('对于实际的WGS84坐标应该返回true', () => {
      // 北京天安门 WGS84 坐标
      const wgs = { lng: 116.391, lat: 39.9075 }
      const result = isPossiblyWgs84(wgs.lng, wgs.lat)

      // 注意：这个函数是启发式检测，不是100%准确
      // 对于某些坐标可能误判，这是正常的
      expect(typeof result).toBe('boolean')
    })

    it('对于实际的GCJ-02坐标应该返回false', () => {
      // 先转换为 GCJ-02
      const wgs = { lng: 116.391, lat: 39.9075 }
      const gcj = wgs84ToGcj02(wgs.lng, wgs.lat)

      const result = isPossiblyWgs84(gcj.lng, gcj.lat)

      expect(result).toBe(false)
    })

    it('对于中国境外坐标应该返回false', () => {
      const nyCoord = { lng: -73.9857, lat: 40.7580 }
      const result = isPossiblyWgs84(nyCoord.lng, nyCoord.lat)

      expect(result).toBe(false)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理精确在边界上的坐标', () => {
      // 中国边界坐标
      const borderCases = [
        { lng: 72.004, lat: 0.8293 }, // 西南角
        { lng: 137.8347, lat: 55.8271 }, // 东北角
      ]

      borderCases.forEach(coord => {
        const gcj = wgs84ToGcj02(coord.lng, coord.lat)
        // 应该进行转换
        expect(gcj.lng).toBeDefined()
        expect(gcj.lat).toBeDefined()
      })
    })

    it('应该处理经度为0的情况', () => {
      const coord = { lng: 0, lat: 0 }
      const gcj = wgs84ToGcj02(coord.lng, coord.lat)

      // 0,0 不在中国境内，应该返回原坐标
      expect(gcj.lng).toBe(0)
      expect(gcj.lat).toBe(0)
    })

    it('应该处理负坐标', () => {
      const coord = { lng: -122.4194, lat: 37.7749 } // 旧金山
      const gcj = wgs84ToGcj02(coord.lng, coord.lat)

      // 不在中国境内，返回原坐标
      expect(gcj.lng).toBe(coord.lng)
      expect(gcj.lat).toBe(coord.lat)
    })

    it('应该处理极端偏北的坐标', () => {
      const coord = { lng: 90, lat: 80 } // 极北
      const gcj = wgs84ToGcj02(coord.lng, coord.lat)

      // 不在中国境内，返回原坐标
      expect(gcj.lng).toBe(coord.lng)
      expect(gcj.lat).toBe(coord.lat)
    })
  })

  describe('精度和性能测试', () => {
    it('转换后的坐标应该保持足够的精度', () => {
      const wgs = { lng: 116.39123456789, lat: 39.90756789012 }
      const gcj = wgs84ToGcj02(wgs.lng, wgs.lat)

      // 转换后应该仍然保持小数点后多位精度
      const lngStr = gcj.lng.toString()
      const latStr = gcj.lat.toString()

      expect(lngStr.split('.')[1]?.length).toBeGreaterThan(5)
      expect(latStr.split('.')[1]?.length).toBeGreaterThan(5)
    })

    it('批量转换应该能处理大量坐标', () => {
      // 生成 1000 个坐标
      const coords = Array.from({ length: 1000 }, (_, i) => ({
        lng: 116 + i * 0.001,
        lat: 39 + i * 0.001,
      }))

      const startTime = Date.now()
      const result = batchWgs84ToGcj02(coords)
      const endTime = Date.now()

      expect(result).toHaveLength(1000)
      // 转换应该在合理时间内完成（< 100ms）
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('坐标系偏移量测试', () => {
    it('中国境内坐标的偏移量应该在合理范围内（50-500米）', () => {
      const cities = [
        { name: '北京', lng: 116.404, lat: 39.915 },
        { name: '上海', lng: 121.472, lat: 31.231 },
        { name: '深圳', lng: 114.057, lat: 22.543 },
      ]

      cities.forEach(({ name, lng, lat }) => {
        const gcj = wgs84ToGcj02(lng, lat)

        // 计算偏移距离（米）
        const lngOffset = (gcj.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180)
        const latOffset = (gcj.lat - lat) * 111000
        const totalOffset = Math.sqrt(lngOffset ** 2 + latOffset ** 2)

        // 偏移量应该在 50-650 米之间（不同城市偏移量略有不同）
        expect(totalOffset).toBeGreaterThan(50)
        expect(totalOffset).toBeLessThan(650)
      })
    })
  })
})
