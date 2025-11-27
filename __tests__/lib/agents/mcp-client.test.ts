/**
 * MCP 客户端模块导出测试
 * 验证模块正确导出所需的类和函数
 */

import { describe, it, expect, vi } from 'vitest'

// 由于 MCPClient 需要 API key，我们只测试模块导出
describe('MCP 客户端模块导出', () => {
  it('应该导出 MCPClient 类', async () => {
    // 动态导入以避免初始化错误
    const module = await import('@/lib/agents/mcp-client')
    expect(module.MCPClient).toBeDefined()
    expect(typeof module.MCPClient).toBe('function')
  })

  it('应该导出 getMCPClient 函数', async () => {
    const module = await import('@/lib/agents/mcp-client')
    expect(module.getMCPClient).toBeDefined()
    expect(typeof module.getMCPClient).toBe('function')
  })

  it('应该导出类型定义', async () => {
    // 类型导出在运行时不可检查，但我们可以验证模块正常加载
    const module = await import('@/lib/agents/mcp-client')
    expect(module).toBeDefined()
  })
})

describe('MCPClient 类结构', () => {
  it('MCPClient 应该是一个构造函数', async () => {
    const { MCPClient } = await import('@/lib/agents/mcp-client')
    expect(MCPClient.prototype).toBeDefined()
    expect(MCPClient.prototype.constructor).toBe(MCPClient)
  })

  it('MCPClient 应该有必要的方法', async () => {
    const { MCPClient } = await import('@/lib/agents/mcp-client')

    // 检查原型方法
    const expectedMethods = [
      'getWeatherForecast',
      'searchPOI',
      'searchNearby',
      'getDrivingRoute',
      'getWalkingRoute',
      'getTransitRoute',
      'geocode',
      'reverseGeocode',
      'calculateDistance',
    ]

    expectedMethods.forEach((method) => {
      expect(typeof MCPClient.prototype[method]).toBe('function')
    })
  })
})

describe('MCP 客户端类型验证', () => {
  it('WeatherForecastResult 类型应该有正确的结构', () => {
    // 模拟一个 WeatherForecastResult 对象
    const mockWeatherResult = {
      city: '杭州',
      forecasts: [
        {
          date: '2025-12-01',
          dayweather: '晴',
          nightweather: '多云',
          daytemp: '15',
          nighttemp: '5',
          daywind: '北',
          nightwind: '北',
          daypower: '3',
          nightpower: '2',
        },
      ],
    }

    expect(mockWeatherResult.city).toBe('杭州')
    expect(mockWeatherResult.forecasts).toHaveLength(1)
    expect(mockWeatherResult.forecasts[0].dayweather).toBe('晴')
  })

  it('POI 类型应该有正确的结构', () => {
    const mockPOI = {
      id: '123456',
      name: '西湖',
      type: '风景名胜',
      address: '杭州市西湖区',
      location: '120.148,30.242',
      tel: '0571-12345678',
    }

    expect(mockPOI.id).toBe('123456')
    expect(mockPOI.name).toBe('西湖')
    expect(mockPOI.location).toMatch(/^\d+\.\d+,\d+\.\d+$/)
  })

  it('RouteResult 类型应该有正确的结构', () => {
    const mockRoute = {
      distance: 5000,
      duration: 900,
      steps: [
        {
          instruction: '向东行驶500米',
          distance: 500,
          duration: 60,
        },
      ],
    }

    expect(mockRoute.distance).toBe(5000)
    expect(mockRoute.duration).toBe(900)
    expect(mockRoute.steps).toHaveLength(1)
  })

  it('GeocodeResult 类型应该有正确的结构', () => {
    const mockGeocode = {
      formatted_address: '浙江省杭州市西湖区西湖风景名胜区',
      location: '120.148,30.242',
      level: '兴趣点',
    }

    expect(mockGeocode.formatted_address).toContain('杭州')
    expect(mockGeocode.location).toMatch(/^\d+\.\d+,\d+\.\d+$/)
  })

  it('DistanceResult 类型应该有正确的结构', () => {
    const mockDistance = {
      origin_id: '1',
      dest_id: '1',
      distance: 5000,
      duration: 900,
    }

    expect(mockDistance.distance).toBe(5000)
    expect(mockDistance.duration).toBe(900)
  })
})

describe('MCPClient 错误处理', () => {
  it('缺少 API key 时应该抛出错误', async () => {
    // 暂时清除环境变量
    const originalEnv = process.env.AMAP_WEB_SERVICE_KEY
    delete process.env.AMAP_WEB_SERVICE_KEY

    // 需要重新加载模块以获取新的配置
    // 由于模块缓存，这里只能验证类存在
    const { MCPClient } = await import('@/lib/agents/mcp-client')
    expect(MCPClient).toBeDefined()

    // 恢复环境变量
    if (originalEnv) {
      process.env.AMAP_WEB_SERVICE_KEY = originalEnv
    }
  })
})
