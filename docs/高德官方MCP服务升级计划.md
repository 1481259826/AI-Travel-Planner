# 高德官方 MCP 服务升级计划

## 概述

本计划将项目中的自定义高德地图 MCP 客户端（`lib/agents/mcp-client.ts`）升级为使用高德官方 MCP 服务。

### 当前状态

- **现有实现**：`lib/agents/mcp-client.ts` 直接封装高德 REST API
- **问题**：
  - 非标准 MCP 协议，无法与其他 MCP 客户端互操作
  - 缺少高德官方新功能（如生成专属地图、导航唤端等）
  - 维护成本高，需要自己处理 API 变更

### 升级目标

- 使用高德官方 MCP 服务（SSE 方式）
- 获得完整的 12+ 官方工具支持
- 支持与高德地图 APP 联动（一键生成专属地图）
- 降低维护成本，享受官方更新

---

## 高德官方 MCP 服务信息

### 官方 SSE 服务地址

```
https://mcp.amap.com/sse?key=您的API_KEY
```

### 官方支持的工具列表（12+）

| 工具名称 | 功能描述 | 当前项目是否有 |
|---------|---------|---------------|
| `maps_geo` | 地理编码（地址转坐标） | ✅ 有 |
| `maps_regeo` | 逆地理编码（坐标转地址） | ✅ 有 |
| `maps_ip_location` | IP 定位 | ❌ 无 |
| `maps_weather` | 天气查询 | ✅ 有 |
| `maps_bicycling` | 骑行路径规划 | ❌ 无 |
| `maps_walking` | 步行路径规划 | ✅ 有 |
| `maps_driving` | 驾车路径规划 | ✅ 有 |
| `maps_transit_integrated` | 公交路径规划 | ✅ 有 |
| `maps_distance` | 距离测量 | ✅ 有 |
| `maps_search_text` | 关键词搜索 POI | ✅ 有 |
| `maps_search_around` | 周边搜索 POI | ✅ 有 |
| `maps_search_detail` | POI 详情搜索 | ❌ 无 |
| `amap_maps_bindmap` | 生成专属地图（高德 APP 联动） | ❌ 无（新功能） |
| `amap_maps_navi` | 导航到目的地（唤端） | ❌ 无（新功能） |
| `amap_maps_taxi` | 打车服务（唤端） | ❌ 无（新功能） |

### 官方 vs 第三方实现对比

| 选项 | 优点 | 缺点 |
|-----|------|------|
| **官方 SSE 服务** | 官方维护、功能最全、支持 APP 联动 | 依赖外部服务、需要网络 |
| **npm 包本地部署** | 离线可用、可自定义 | 需要维护、功能可能滞后 |
| **当前自实现** | 完全可控 | 非标准、维护成本高 |

**推荐方案**：使用官方 SSE 服务 + 本地缓存 + 降级策略

---

## 升级方案

### Phase 1: 创建 MCP SSE 客户端适配器

**目标**：创建标准 MCP 协议客户端，连接高德官方 SSE 服务

**工作内容**：

1. 安装 MCP SDK 依赖
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. 创建 `lib/agents/mcp-sse-client.ts`
   - 实现 SSE 连接管理
   - 实现工具调用方法
   - 添加连接状态监控
   - 添加自动重连机制

3. 核心代码结构：
   ```typescript
   // lib/agents/mcp-sse-client.ts
   import { Client } from '@modelcontextprotocol/sdk/client/index.js'
   import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

   export class AmapMCPClient {
     private client: Client
     private connected: boolean = false

     constructor(apiKey: string) {
       this.client = new Client({
         name: 'ai-travel-planner',
         version: '1.0.0'
       })
     }

     async connect(): Promise<void> {
       const transport = new SSEClientTransport(
         new URL(`https://mcp.amap.com/sse?key=${this.apiKey}`)
       )
       await this.client.connect(transport)
       this.connected = true
     }

     async callTool(name: string, args: Record<string, any>): Promise<any> {
       return this.client.callTool({ name, arguments: args })
     }
   }
   ```

**预计改动文件**：
- 新建 `lib/agents/mcp-sse-client.ts`
- 修改 `package.json`（添加依赖）

---

### Phase 2: 实现工具方法映射

**目标**：将官方工具映射为与现有接口兼容的方法

**工作内容**：

1. 创建工具映射层 `lib/agents/mcp-tools.ts`
   ```typescript
   // 保持与现有 MCPClient 相同的接口
   export class AmapMCPTools {
     private client: AmapMCPClient

     // 天气查询 - 映射到 maps_weather
     async getWeatherForecast(city: string): Promise<WeatherForecastResult | null> {
       const result = await this.client.callTool('maps_weather', { city })
       return this.transformWeatherResult(result)
     }

     // POI 搜索 - 映射到 maps_search_text
     async searchPOI(params: POISearchParams): Promise<POISearchResult | null> {
       const result = await this.client.callTool('maps_search_text', {
         keywords: params.keywords,
         city: params.city,
         // ... 参数映射
       })
       return this.transformPOIResult(result)
     }

     // 新功能：生成专属地图
     async generateCustomMap(tripName: string, tripDetails: any): Promise<string> {
       const result = await this.client.callTool('amap_maps_bindmap', {
         name: tripName,
         details: tripDetails
       })
       return result.url // 返回唤端链接
     }
   }
   ```

2. 数据转换函数（官方格式 → 项目内部格式）

**预计改动文件**：
- 新建 `lib/agents/mcp-tools.ts`
- 新建 `lib/agents/mcp-transformers.ts`

---

### Phase 3: 添加降级策略和缓存

**目标**：确保服务稳定性，SSE 不可用时降级到直接 API 调用

**工作内容**：

1. 创建统一的 MCP 客户端工厂 `lib/agents/mcp-factory.ts`
   ```typescript
   export async function createMCPClient(options: MCPClientOptions): Promise<IMCPClient> {
     // 优先尝试官方 SSE
     if (options.preferOfficial !== false) {
       try {
         const client = new AmapMCPClient(options.apiKey)
         await client.connect()
         console.log('[MCP] Connected to official Amap MCP service')
         return new AmapMCPTools(client)
       } catch (error) {
         console.warn('[MCP] Failed to connect official service, falling back to direct API')
       }
     }

     // 降级到现有的直接 API 实现
     return new MCPClient(options)
   }
   ```

2. 复用现有缓存机制（`lib/agents/cache.ts`）

3. 添加健康检查和自动切换

**预计改动文件**：
- 新建 `lib/agents/mcp-factory.ts`
- 修改 `lib/agents/index.ts`

---

### Phase 4: 集成到工作流

**目标**：将新 MCP 客户端集成到 LangGraph 工作流中

**工作内容**：

1. 修改 Agent 节点使用新客户端
   - `lib/agents/nodes/weather-scout.ts`
   - `lib/agents/nodes/itinerary-planner.ts`
   - `lib/agents/nodes/accommodation.ts`
   - `lib/agents/nodes/transport.ts`
   - `lib/agents/nodes/dining.ts`

2. 更新工作流配置
   ```typescript
   // lib/agents/workflow.ts
   import { createMCPClient } from './mcp-factory'

   export async function createTripPlanningWorkflow(config: WorkflowConfig) {
     const mcpClient = await createMCPClient({
       apiKey: config.mapApiKey,
       preferOfficial: config.useOfficialMCP ?? true
     })

     // 注入到各个节点
     // ...
   }
   ```

**预计改动文件**：
- `lib/agents/workflow.ts`
- `lib/agents/nodes/*.ts`（5 个文件）

---

### Phase 5: 添加新功能支持

**目标**：利用官方 MCP 的独有功能增强用户体验

**工作内容**：

1. **生成专属地图功能**
   - 在行程详情页添加「同步到高德地图」按钮
   - 调用 `amap_maps_bindmap` 生成专属地图链接
   - 支持移动端唤起高德地图 APP

2. **导航唤端功能**
   - 在景点卡片添加「导航」按钮
   - 调用 `amap_maps_navi` 获取导航链接

3. **打车功能**
   - 在交通方案中添加「一键打车」选项
   - 调用 `amap_maps_taxi` 唤起打车服务

4. **骑行路径规划**
   - 在交通方式中新增骑行选项
   - 调用 `maps_bicycling` 规划骑行路线

**预计改动文件**：
- `components/TripDetail.tsx`
- `components/AttractionCard.tsx`
- `lib/agents/nodes/transport.ts`
- 新建相关 API 路由

---

### Phase 6: 配置和环境变量更新

**目标**：完善配置管理，支持灵活切换

**工作内容**：

1. 更新环境变量
   ```bash
   # .env.local

   # MCP 服务配置
   AMAP_MCP_MODE=official  # official | local | direct
   AMAP_MCP_SSE_URL=https://mcp.amap.com/sse

   # 现有配置保持不变
   AMAP_WEB_SERVICE_KEY=xxx
   NEXT_PUBLIC_MAP_API_KEY=xxx
   ```

2. 更新 `lib/config.ts`
   ```typescript
   export const appConfig = {
     // ...
     mcp: {
       mode: process.env.AMAP_MCP_MODE || 'official',
       sseUrl: process.env.AMAP_MCP_SSE_URL || 'https://mcp.amap.com/sse',
       enableFallback: true,
       cacheEnabled: true
     }
   }
   ```

3. 更新 `.env.example`

**预计改动文件**：
- `.env.example`
- `lib/config.ts`
- `CLAUDE.md`（更新文档）

---

### Phase 7: 测试和验证

**目标**：确保升级后功能正常

**工作内容**：

1. 单元测试
   - MCP SSE 客户端连接测试
   - 工具调用测试
   - 数据转换测试
   - 降级策略测试

2. 集成测试
   - 完整行程生成流程测试
   - 各 Agent 节点测试
   - 缓存机制测试

3. E2E 测试
   - 用户创建行程完整流程
   - 新功能（同步到高德地图）测试

**预计改动文件**：
- 新建 `lib/agents/__tests__/mcp-sse-client.test.ts`
- 新建 `lib/agents/__tests__/mcp-tools.test.ts`

---

## 文件变更清单

### 新增文件

| 文件路径 | 描述 |
|---------|------|
| `lib/agents/mcp-sse-client.ts` | 官方 MCP SSE 客户端 |
| `lib/agents/mcp-tools.ts` | 工具方法映射层 |
| `lib/agents/mcp-transformers.ts` | 数据格式转换函数 |
| `lib/agents/mcp-factory.ts` | MCP 客户端工厂 |
| `lib/agents/__tests__/mcp-sse-client.test.ts` | 单元测试 |
| `lib/agents/__tests__/mcp-tools.test.ts` | 单元测试 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `package.json` | 添加 `@modelcontextprotocol/sdk` 依赖 |
| `lib/config.ts` | 添加 MCP 配置项 |
| `lib/agents/index.ts` | 更新导出 |
| `lib/agents/workflow.ts` | 使用新 MCP 客户端 |
| `lib/agents/nodes/weather-scout.ts` | 适配新接口 |
| `lib/agents/nodes/itinerary-planner.ts` | 适配新接口 |
| `lib/agents/nodes/accommodation.ts` | 适配新接口 |
| `lib/agents/nodes/transport.ts` | 适配新接口，添加骑行 |
| `lib/agents/nodes/dining.ts` | 适配新接口 |
| `.env.example` | 添加新环境变量 |
| `CLAUDE.md` | 更新项目文档 |

### 保留文件（降级使用）

| 文件路径 | 说明 |
|---------|------|
| `lib/agents/mcp-client.ts` | 保留作为降级方案 |
| `lib/agents/cache.ts` | 复用缓存机制 |

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 官方 SSE 服务不稳定 | 行程生成失败 | 降级策略 + 本地缓存 |
| API 格式变更 | 数据转换失败 | 版本化转换函数 + 监控告警 |
| 网络延迟增加 | 用户体验下降 | 并行请求 + 缓存预热 |
| API Key 配额限制 | 服务不可用 | 用户自定义 Key + 系统 Key 双重保障 |

---

## 参考资源

- [高德 MCP Server 官方文档](https://lbs.amap.com/api/mcp-server/summary)
- [高德 MCP Server 快速接入](https://lbs.amap.com/api/mcp-server/gettingstarted)
- [高德 MCP 工具列表](https://lbs.amap.com/api/mcp-server/mcp-tool)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/)
- [MCP SDK (TypeScript)](https://github.com/modelcontextprotocol/typescript-sdk)
- [sugarforever/amap-mcp-server](https://github.com/sugarforever/amap-mcp-server) - 第三方实现参考

---

## 进度跟踪

| Phase | 状态 | 完成日期 |
|-------|------|---------|
| Phase 1: 创建 MCP SSE 客户端适配器 | ✅ 已完成 | 2025-12-04 |
| Phase 2: 实现工具方法映射 | ✅ 已完成 | 2025-12-04 |
| Phase 3: 添加降级策略和缓存 | ✅ 已完成 | 2025-12-04 |
| Phase 4: 集成到工作流 | ✅ 已完成 | 2025-12-04 |
| Phase 5: 添加新功能支持 | ✅ 已完成 | 2025-12-04 |
| Phase 6: 配置和环境变量更新 | ✅ 已完成 | 2025-12-04 |
| Phase 7: 测试和验证 | ⬜ 待开始 | |

### Phase 5 完成详情

**已实现功能**：

1. **高德 APP 集成 API** (`app/api/amap-app/route.ts`)
   - 生成专属地图 (custom-map)
   - 导航唤端 (navigation)
   - 打车唤端 (taxi)

2. **高德 APP 集成 Hook** (`hooks/useAmapApp.ts`)
   - `navigateTo()` - 导航到目的地
   - `callTaxi()` - 一键打车
   - `syncToAmap()` - 同步行程到高德地图
   - 自动处理认证和错误

3. **同步到高德地图按钮** (`components/SyncToAmapButton.tsx`)
   - 位于行程详情页头部操作区
   - 显示景点数量预览
   - 支持移动端唤起高德 APP

4. **景点卡片导航和打车按钮** (`components/AttractionCard.tsx`)
   - 每个景点卡片底部添加「导航」「打车」按钮
   - 点击直接唤起高德地图 APP

5. **骑行路线规划支持**
   - `lib/agents/mcp-client.ts` 添加 `getBicyclingRoute()`
   - `lib/agents/nodes/transport.ts` 优化交通方式选择逻辑
   - 1-5km 距离自动推荐骑行

---

*文档创建日期：2025-12-04*
*最后更新：2025-12-04*
