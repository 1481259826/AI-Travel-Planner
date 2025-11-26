/**
 * AMap MCP Server 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatDistance,
  formatDuration,
  parseCoordinate,
  formatCoordinate,
  isValidCoordinateString,
  normalizeStringField,
} from '../src/utils/transform.js'

describe('Transform Utils', () => {
  describe('parseCoordinate', () => {
    it('should parse coordinate string to object', () => {
      const result = parseCoordinate('116.397428,39.90923')
      expect(result).toEqual({ lng: 116.397428, lat: 39.90923 })
    })
  })

  describe('formatCoordinate', () => {
    it('should format coordinate object to string', () => {
      const result = formatCoordinate({ lng: 116.397428, lat: 39.90923 })
      expect(result).toBe('116.397428,39.90923')
    })
  })

  describe('isValidCoordinateString', () => {
    it('should return true for valid coordinate', () => {
      expect(isValidCoordinateString('116.397428,39.90923')).toBe(true)
    })

    it('should return false for invalid format', () => {
      expect(isValidCoordinateString('invalid')).toBe(false)
      expect(isValidCoordinateString('')).toBe(false)
      expect(isValidCoordinateString('116.397428')).toBe(false)
    })

    it('should return false for out of range coordinates', () => {
      // 经度超出中国范围
      expect(isValidCoordinateString('200,39.90923')).toBe(false)
      // 纬度超出中国范围
      expect(isValidCoordinateString('116.397428,60')).toBe(false)
    })
  })

  describe('normalizeStringField', () => {
    it('should return string as-is', () => {
      expect(normalizeStringField('test')).toBe('test')
    })

    it('should return first element of array', () => {
      expect(normalizeStringField(['test', 'other'])).toBe('test')
    })

    it('should return empty string for empty array', () => {
      expect(normalizeStringField([])).toBe('')
    })

    it('should return empty string for null/undefined', () => {
      expect(normalizeStringField(null)).toBe('')
      expect(normalizeStringField(undefined)).toBe('')
    })
  })

  describe('formatDistance', () => {
    it('should format meters under 1000', () => {
      expect(formatDistance(500)).toBe('500米')
      expect(formatDistance('500')).toBe('500米')
    })

    it('should format kilometers over 1000', () => {
      expect(formatDistance(1500)).toBe('1.5公里')
      expect(formatDistance(10000)).toBe('10.0公里')
    })

    it('should handle invalid input', () => {
      expect(formatDistance('invalid')).toBe('未知')
      expect(formatDistance(NaN)).toBe('未知')
    })
  })

  describe('formatDuration', () => {
    it('should format seconds under 60', () => {
      expect(formatDuration(30)).toBe('30秒')
    })

    it('should format minutes under 3600', () => {
      expect(formatDuration(90)).toBe('1分钟')
      expect(formatDuration(300)).toBe('5分钟')
    })

    it('should format hours over 3600', () => {
      expect(formatDuration(3600)).toBe('1小时')
      expect(formatDuration(5400)).toBe('1小时30分钟')
    })

    it('should handle invalid input', () => {
      expect(formatDuration('invalid')).toBe('未知')
    })
  })
})

describe('HTTP Utils', () => {
  describe('buildUrl', () => {
    // 动态导入以避免模块加载问题
    it('should build URL with params', async () => {
      const { buildUrl } = await import('../src/utils/http.js')

      const url = buildUrl('https://api.example.com/test', {
        key: 'abc123',
        city: '北京',
        limit: 10,
      })

      expect(url).toContain('key=abc123')
      expect(url).toContain('city=')
      expect(url).toContain('limit=10')
    })

    it('should skip undefined values', async () => {
      const { buildUrl } = await import('../src/utils/http.js')

      const url = buildUrl('https://api.example.com/test', {
        key: 'abc123',
        city: undefined,
        empty: '',
      })

      expect(url).toContain('key=abc123')
      expect(url).not.toContain('city=')
      expect(url).not.toContain('empty=')
    })
  })
})

describe('Weather Tool', () => {
  describe('getWeatherIcon', () => {
    it('should return correct icons', async () => {
      const { getWeatherIcon } = await import('../src/tools/weather.js')

      expect(getWeatherIcon('晴')).toBe('☀️')
      expect(getWeatherIcon('多云')).toBe('☁️')
      expect(getWeatherIcon('阴')).toBe('☁️')
      expect(getWeatherIcon('小雨')).toBe('🌧️')
      expect(getWeatherIcon('大雪')).toBe('❄️')
      expect(getWeatherIcon('雷电')).toBe('⛈️')  // 纯雷电
      expect(getWeatherIcon('雷阵雨')).toBe('🌧️')  // 雷阵雨优先匹配雨
      expect(getWeatherIcon('雾')).toBe('🌫️')
      expect(getWeatherIcon('霾')).toBe('🌫️')
      expect(getWeatherIcon('未知')).toBe('🌤️')
    })
  })

  describe('getWeatherAdvice', () => {
    it('should return correct advice', async () => {
      const { getWeatherAdvice } = await import('../src/tools/weather.js')

      expect(getWeatherAdvice('小雨')).toContain('雨具')
      expect(getWeatherAdvice('大雪')).toContain('保暖')
      expect(getWeatherAdvice('雾')).toContain('能见度')
      expect(getWeatherAdvice('晴')).toContain('户外')
      expect(getWeatherAdvice('多云')).toContain('出行')
    })
  })
})

describe('Distance Tool', () => {
  describe('DISTANCE_TYPES', () => {
    it('should have correct type descriptions', async () => {
      const { DISTANCE_TYPES } = await import('../src/tools/distance.js')

      expect(DISTANCE_TYPES[0]).toBe('直线距离')
      expect(DISTANCE_TYPES[1]).toBe('驾车导航距离')
      expect(DISTANCE_TYPES[3]).toBe('步行规划距离')
    })
  })
})

describe('Route Tool', () => {
  describe('DRIVING_STRATEGIES', () => {
    it('should have correct strategy descriptions', async () => {
      const { DRIVING_STRATEGIES } = await import('../src/tools/route.js')

      expect(DRIVING_STRATEGIES[0]).toContain('速度')
      expect(DRIVING_STRATEGIES[1]).toContain('费用')
      expect(DRIVING_STRATEGIES[2]).toContain('距离')
      expect(DRIVING_STRATEGIES[4]).toContain('拥堵')
    })
  })
})

describe('Tool Definitions', () => {
  it('should export all tool definitions', async () => {
    const { getAllToolDefinitions } = await import('../src/server.js')

    const tools = getAllToolDefinitions()

    expect(tools).toHaveLength(9)

    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toContain('get_weather_forecast')
    expect(toolNames).toContain('search_poi')
    expect(toolNames).toContain('search_nearby')
    expect(toolNames).toContain('get_driving_route')
    expect(toolNames).toContain('get_walking_route')
    expect(toolNames).toContain('get_transit_route')
    expect(toolNames).toContain('geocode')
    expect(toolNames).toContain('reverse_geocode')
    expect(toolNames).toContain('calculate_distance')
  })

  it('all tools should have required fields', async () => {
    const { getAllToolDefinitions } = await import('../src/server.js')

    const tools = getAllToolDefinitions()

    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(tool.description).toBeDefined()
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    }
  })
})
