/**
 * AMap MCP Server 主类
 * 整合所有工具，提供 MCP 协议接口
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// 导入工具处理函数和定义
import {
  weatherToolDefinition,
  handleWeatherTool,
} from './tools/weather.js'
import {
  poiSearchToolDefinition,
  nearbySearchToolDefinition,
  handlePOISearchTool,
  handleNearbySearchTool,
} from './tools/poi.js'
import {
  drivingRouteToolDefinition,
  walkingRouteToolDefinition,
  transitRouteToolDefinition,
  handleDrivingRouteTool,
  handleWalkingRouteTool,
  handleTransitRouteTool,
} from './tools/route.js'
import {
  geocodeToolDefinition,
  reverseGeocodeToolDefinition,
  handleGeocodeTool,
  handleReverseGeocodeTool,
} from './tools/geocode.js'
import {
  distanceToolDefinition,
  handleDistanceTool,
} from './tools/distance.js'

/**
 * AMap MCP Server 配置
 */
export interface AmapServerConfig {
  name?: string
  version?: string
}

/**
 * 创建 AMap MCP Server
 */
export function createAmapServer(config: AmapServerConfig = {}) {
  const { name = 'amap-mcp-server', version = '1.0.0' } = config

  const server = new McpServer({
    name,
    version,
  })

  // 注册天气工具
  server.tool(
    weatherToolDefinition.name,
    weatherToolDefinition.description,
    {
      city: z.string().describe('城市名称'),
      extensions: z.enum(['base', 'all']).optional().describe('返回数据类型'),
    },
    async (args) => {
      const result = await handleWeatherTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册 POI 搜索工具
  server.tool(
    poiSearchToolDefinition.name,
    poiSearchToolDefinition.description,
    {
      keywords: z.string().describe('搜索关键词'),
      city: z.string().optional().describe('城市名称'),
      types: z.string().optional().describe('POI 类型代码'),
      city_limit: z.boolean().optional().describe('是否仅在指定城市搜索'),
      page_size: z.number().optional().describe('每页返回数量'),
      page: z.number().optional().describe('页码'),
    },
    async (args) => {
      const result = await handlePOISearchTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册周边搜索工具
  server.tool(
    nearbySearchToolDefinition.name,
    nearbySearchToolDefinition.description,
    {
      location: z.string().describe('中心点坐标'),
      keywords: z.string().optional().describe('搜索关键词'),
      types: z.string().optional().describe('POI 类型代码'),
      radius: z.number().optional().describe('搜索半径'),
      page_size: z.number().optional().describe('每页返回数量'),
    },
    async (args) => {
      const result = await handleNearbySearchTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册驾车路线工具
  server.tool(
    drivingRouteToolDefinition.name,
    drivingRouteToolDefinition.description,
    {
      origin: z.string().describe('起点坐标'),
      destination: z.string().describe('终点坐标'),
      strategy: z.number().optional().describe('路线策略'),
    },
    async (args) => {
      const result = await handleDrivingRouteTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册步行路线工具
  server.tool(
    walkingRouteToolDefinition.name,
    walkingRouteToolDefinition.description,
    {
      origin: z.string().describe('起点坐标'),
      destination: z.string().describe('终点坐标'),
    },
    async (args) => {
      const result = await handleWalkingRouteTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册公交路线工具
  server.tool(
    transitRouteToolDefinition.name,
    transitRouteToolDefinition.description,
    {
      origin: z.string().describe('起点坐标'),
      destination: z.string().describe('终点坐标'),
      city: z.string().describe('城市名称'),
    },
    async (args) => {
      const result = await handleTransitRouteTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册地理编码工具
  server.tool(
    geocodeToolDefinition.name,
    geocodeToolDefinition.description,
    {
      address: z.string().describe('地址'),
      city: z.string().optional().describe('城市名称'),
    },
    async (args) => {
      const result = await handleGeocodeTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册逆地理编码工具
  server.tool(
    reverseGeocodeToolDefinition.name,
    reverseGeocodeToolDefinition.description,
    {
      location: z.string().describe('坐标'),
      extensions: z.enum(['base', 'all']).optional().describe('返回数据详细程度'),
    },
    async (args) => {
      const result = await handleReverseGeocodeTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  // 注册距离计算工具
  server.tool(
    distanceToolDefinition.name,
    distanceToolDefinition.description,
    {
      origins: z.string().describe('起点坐标'),
      destination: z.string().describe('终点坐标'),
      type: z.union([z.literal(0), z.literal(1), z.literal(3)]).optional().describe('距离类型'),
    },
    async (args) => {
      const result = await handleDistanceTool(args as any)
      return {
        content: [{ type: 'text', text: result }],
      }
    }
  )

  return server
}

/**
 * 使用 stdio 传输启动服务器
 */
export async function startStdioServer(config?: AmapServerConfig): Promise<void> {
  const server = createAmapServer(config)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  console.error('AMap MCP Server started (stdio mode)')
}

/**
 * 获取所有工具定义
 */
export function getAllToolDefinitions() {
  return [
    weatherToolDefinition,
    poiSearchToolDefinition,
    nearbySearchToolDefinition,
    drivingRouteToolDefinition,
    walkingRouteToolDefinition,
    transitRouteToolDefinition,
    geocodeToolDefinition,
    reverseGeocodeToolDefinition,
    distanceToolDefinition,
  ]
}
