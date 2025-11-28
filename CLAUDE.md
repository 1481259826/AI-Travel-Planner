# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI 旅行规划师 - 基于 Next.js 15 的全栈 AI 旅行规划 Web 应用，支持多 AI 模型、语音输入、离线缓存、PWA 等功能。

## 核心技术栈

- **框架**: Next.js 15 (App Router + TypeScript)
- **认证/数据库**: Supabase (PostgreSQL + RLS 行级安全)
- **AI 模型**: DeepSeek (OpenAI 兼容 API) + ModelScope (Qwen 系列)
- **AI 编排**: LangGraph (多智能体状态图编排)
- **状态管理**: Zustand (主题存储等)
- **离线存储**: IndexedDB (idb 库)
- **地图**: 高德地图 API (GCJ-02 坐标系)
- **PWA**: next-pwa + Workbox
- **加密**: crypto-js (AES-256)
- **PDF**: jsPDF + jspdf-autotable + html2canvas

## 重要配置

### 环境变量位置
- `.env.local` - 本地开发环境变量（不提交）
- `.env.example` - 环境变量模板

### 端口配置
- 默认端口: `3008` (配置在 package.json 的 dev 脚本中)
- 修改端口时需同步更新: `package.json`, `ecosystem.config.js`, `scripts/health-check.js`

### 坐标系统
- **重要**: 使用高德地图，必须使用 **GCJ-02** 坐标系（国测局坐标）
- AI 生成的坐标通常是 WGS84，需要转换或通过高德 API 获取
- 转换逻辑在 `lib/coordinate-converter.ts` 和 `lib/amap-geocoding.ts`

## 常用命令

### 开发
```bash
npm run dev:safe          # 推荐：自动检测并清理僵尸进程后启动
npm run dev               # 标准开发服务器启动 (http://localhost:3008)
npm run dev:pwa           # PWA 开发模式（启用 Service Worker）
npm run dev:pm2           # 使用 PM2 生产级进程管理
npm run dev:check         # 检查端口健康状态
npm run cleanup           # 自动清理僵尸进程
```

### 生产
```bash
npm run build             # 构建生产版本
npm start                 # 启动生产服务器
```

### PM2 进程管理
```bash
npm run stop              # 停止 PM2 进程
npm run restart           # 重启 PM2 进程
npm run logs              # 查看 PM2 日志
npm run status            # 查看 PM2 状态
```

### 其他
```bash
npm run lint              # ESLint 检查
```

## 项目架构

### 文件结构关键点

```
app/
├── api/                          # API 路由（Next.js Route Handlers）
│   ├── generate-itinerary/       # AI 行程生成 (v1 单体架构)
│   ├── v2/generate-itinerary/    # AI 行程生成 (v2 多智能体架构)
│   ├── user/                     # 用户相关（profile/password/api-keys）
│   ├── trips/[id]/               # 行程 CRUD + 分享功能
│   ├── expenses/                 # 费用追踪
│   ├── enrich-attraction/        # 景点信息增强（高德 POI）
│   ├── enrich-hotel/             # 酒店信息增强
│   ├── weather/                  # 天气预报
│   ├── metrics/                  # Prometheus 指标端点
│   └── workflow-debug/           # 工作流调试 API（追踪数据）
├── dashboard/                    # 主应用页面
│   ├── create/                   # 创建行程表单
│   ├── settings/                 # 用户设置页面
│   ├── debug/                    # 工作流调试页面（开发环境）
│   └── trips/[id]/               # 行程详情 + 打印页面
└── share/[token]/                # 公开分享页面

components/                       # React 组件（已优化，Phase 3 重构）
├── shared/                       # 共享 UI 组件
│   ├── PhotoCarousel.tsx         # 照片轮播组件
│   └── RatingDisplay.tsx         # 星级评分组件
├── map/                          # 地图相关组件
│   ├── TripMapToolbar.tsx        # 行程地图工具栏
│   └── MapLegend.tsx             # 地图图例
├── settings/                     # 设置页面组件
│   ├── ApiKeyManager.tsx         # API Key 管理主组件
│   └── api-keys/                 # API Key 子组件
│       ├── ApiKeyHeader.tsx      # 头部组件
│       ├── ConfigurationWarnings.tsx  # 配置警告
│       ├── InfoBox.tsx           # 信息提示框
│       ├── ServiceGroup.tsx      # 服务分组
│       ├── SystemKeyCard.tsx     # 系统 Key 卡片
│       └── UserKeyCard.tsx       # 用户 Key 卡片
├── TripOverviewMap.tsx           # 行程总览地图（已优化）
├── MapView.tsx                   # 通用地图视图（已优化）
├── AttractionCard.tsx            # 景点卡片（已优化）
├── HotelCard.tsx                 # 酒店卡片（已优化）
└── ...                           # 其他组件

hooks/                            # React Hooks
├── useAMapLoader.ts              # 高德地图加载 Hook
├── usePhotoCarousel.ts           # 照片轮播 Hook
├── useLangGraphProgress.ts       # LangGraph 进度监听 Hook
└── useAuthFetch.ts               # 认证请求 Hook

lib/
├── agents/                       # LangGraph 多智能体系统
│   ├── state.ts                  # TripState Annotation 定义
│   ├── workflow.ts               # StateGraph 工作流定义
│   ├── mcp-client.ts             # MCP 客户端封装（高德 API）
│   ├── checkpointer.ts           # 检查点存储（MemorySaver/PostgreSQL）
│   ├── tracer.ts                 # 工作流追踪器（Console/JSON/LangSmith）
│   ├── metrics.ts                # 执行指标收集（Prometheus 格式）
│   ├── nodes/                    # Agent 节点函数
│   │   ├── weather-scout.ts      # 天气感知 Agent
│   │   ├── itinerary-planner.ts  # 核心规划 Agent
│   │   ├── accommodation.ts      # 住宿专家 Agent
│   │   ├── transport.ts          # 交通调度 Agent
│   │   ├── dining.ts             # 餐饮推荐 Agent
│   │   ├── budget-critic.ts      # 预算审计 Agent
│   │   └── finalize.ts           # 汇总输出 Agent
│   ├── prompts/                  # Agent System Prompts
│   │   └── *.ts                  # 各 Agent 的提示词
│   └── index.ts                  # 统一导出
├── database/                     # Supabase 模块化目录（重构后）
│   ├── client.ts                 # 客户端初始化
│   ├── auth.ts                   # 认证操作
│   ├── schema.ts                 # 类型定义
│   └── index.ts                  # 统一导出
├── api-keys/                     # API Key 管理模块化目录（重构后）
│   ├── types.ts                  # 类型定义和常量
│   ├── client.ts                 # 获取、解密、缓存
│   ├── validator.ts              # API Key 测试
│   ├── checker.ts                # 可用性检查
│   └── index.ts                  # 统一导出
├── supabase.ts                   # Supabase 向后兼容层（推荐使用 database/）
├── api-keys.ts                   # API Keys 向后兼容层（推荐使用 api-keys/）
├── check-api-keys.ts             # API Key 检查向后兼容层
├── models.ts                     # AI 模型配置
├── config.ts                     # 环境变量配置管理
├── encryption.ts                 # AES-256 加密（用于 API Keys）
├── offline.ts                    # IndexedDB 离线数据管理
├── sync.ts                       # 数据同步引擎
├── coordinate-converter.ts       # WGS84 <-> GCJ-02 坐标转换
├── geo-clustering.ts             # 地理位置聚类优化
├── exportTripToPDF.ts            # PDF 导出核心逻辑
├── ui-helpers.ts                 # UI 常量和辅助函数（Phase 3 新增）
├── map-markers.ts                # 地图标记工具模块（Phase 3 新增）
└── stores/theme-store.ts         # Zustand 主题状态管理

types/index.ts                    # 核心类型定义
database/init.sql                 # Supabase 数据库初始化脚本
```

### 核心数据流

#### 1. 行程生成流程 (v1 单体架构)
1. 用户在 `app/dashboard/create` 填写表单
2. 提交到 `app/api/generate-itinerary/route.ts`
3. 获取用户 API Keys（优先用户自定义，否则用系统默认）
4. 调用 DeepSeek/ModelScope API 生成行程 JSON
5. 坐标修正：使用高德 API 获取准确的 GCJ-02 坐标
6. 地理聚类优化：将相近景点安排在同一天
7. 保存到 Supabase `trips` 表
8. 重定向到行程详情页

#### 1b. 行程生成流程 (v2 多智能体架构)
1. 用户在 `app/dashboard/create` 填写表单
2. 提交到 `app/api/v2/generate-itinerary/route.ts`
3. 执行 LangGraph 工作流（7 个专家 Agent）：
   - **Weather Scout**: 获取天气预报，生成策略标签
   - **Itinerary Planner**: 根据天气策略生成行程骨架
   - **Accommodation Agent**: 推荐酒店住宿（并行）
   - **Transport Agent**: 计算交通路线（并行）
   - **Dining Agent**: 推荐餐厅（并行）
   - **Budget Critic**: 预算审计，超预算触发重试
   - **Finalize Agent**: 整合输出最终行程
4. SSE 流式响应，实时推送 Agent 执行进度
5. 保存到 Supabase `trips` 表
6. 返回行程 ID 和结果

#### 2. 离线数据同步
- 使用 IndexedDB 存储行程和费用数据（`lib/offline.ts`）
- 监听网络状态，离线时将修改操作加入同步队列
- 网络恢复后自动执行同步队列（`lib/sync.ts`）
- 冲突解决：Last-Write-Wins 策略（基于 `updated_at`）

#### 3. API Keys 管理

**模块化架构（已重构）**：
- `lib/api-keys/` - 模块化目录，职责清晰分离
  - `client.ts` - 获取和解密 API Key
  - `validator.ts` - 测试 API Key 有效性
  - `checker.ts` - 检查 API Key 可用性
  - `types.ts` - 类型定义和常量

**使用方式**：

```typescript
import { ApiKeyClient, ApiKeyValidator, ApiKeyChecker } from '@/lib/api-keys'

// 1. 获取 API Key 配置（优先用户，回退系统）
const config = await ApiKeyClient.getUserConfig(userId, 'deepseek', supabase)
if (config) {
  const { apiKey, baseUrl, extraConfig } = config
  // 使用配置
}

// 2. 测试 API Key 有效性
const isValid = await ApiKeyValidator.testDeepSeekKey(apiKey)

// 3. 检查 API Key 可用性
const result = await ApiKeyChecker.checkDeepSeekRequired(userId, token)
if (!result.available) {
  console.log(result.message) // 友好的提示信息
}
```

**API Key 存储**：
- 用户可在设置页面添加自己的 DeepSeek/ModelScope/高德 API Keys
- 存储时使用 AES-256 加密（`lib/encryption.ts`）
- 调用 API 时优先使用用户 Keys，回退到系统默认
- 支持配置自定义 `base_url` 和额外配置（`extra_config`）

**向后兼容**：
- `lib/api-keys.ts` 和 `lib/check-api-keys.ts` 为向后兼容层
- 旧的函数式 API 仍然可用，但推荐使用新的类式 API

### 数据库架构

#### profiles 表
- 扩展 `auth.users`，存储用户配置和偏好
- 字段：`theme`, `default_model`, `default_budget`, `default_origin`

#### trips 表
- 核心行程数据，`itinerary` 字段存储 JSONB 格式的完整行程
- 分享功能：`share_token`（UUID）+ `is_public`（布尔值）
- 状态：`draft | planned | ongoing | completed`

#### expenses 表
- 费用追踪，关联 `trip_id`
- 分类：`accommodation | transportation | food | attractions | shopping | other`

#### api_keys 表
- 用户自定义 API Keys（AES-256 加密）
- 服务类型：`deepseek | modelscope | map | voice`
- 字段：`encrypted_key`, `base_url`, `extra_config`, `is_active`

## 模块化架构（重构）

项目已完成核心模块的重构，建立了清晰的模块化架构。

### Supabase 模块 (`lib/database/`)

**职责分离**：
- `client.ts` - Supabase 客户端初始化
- `auth.ts` - 认证操作（signUp, signIn, signOut）
- `schema.ts` - 数据库类型定义
- `index.ts` - 统一导出

**推荐用法**：
```typescript
import { supabase, signIn, signOut } from '@/lib/database'
import type { Trip, TripInsert } from '@/lib/database'

// 认证
await signIn('user@example.com', 'password')

// 数据库操作
const { data } = await supabase.from('trips').select('*')
```

**向后兼容**：`lib/supabase.ts` 重新导出所有功能，保留 `db.trips` 和 `db.expenses` CRUD 操作。

### API Key 管理模块 (`lib/api-keys/`)

**职责分离**：
- `types.ts` - 类型定义和常量
- `client.ts` - 获取、解密、缓存 API Key
- `validator.ts` - API Key 有效性测试
- `checker.ts` - API Key 可用性检查
- `index.ts` - 统一导出

**推荐用法**：
```typescript
import { ApiKeyClient, ApiKeyValidator, ApiKeyChecker } from '@/lib/api-keys'

// 获取配置
const config = await ApiKeyClient.getUserConfig(userId, 'deepseek', supabase)

// 测试 Key
const isValid = await ApiKeyValidator.testDeepSeekKey(apiKey)

// 检查可用性
const result = await ApiKeyChecker.checkDeepSeekRequired(userId, token)
```

**向后兼容**：`lib/api-keys.ts` 和 `lib/check-api-keys.ts` 导出便捷函数。

## LangGraph 多智能体架构

项目已实现基于 LangGraph 的多智能体协作系统，用于智能行程生成。

### 架构概述

```
用户输入
    │
    ▼
┌───────────────────┐
│  Weather Scout    │  获取天气 + 生成策略标签
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Itinerary Planner │  生成行程骨架
└───────────────────┘
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Hotel   │    │Transport │    │  Dining  │    并行执行
│  Agent   │    │  Agent   │    │  Agent   │
└──────────┘    └──────────┘    └──────────┘
    │                  │                  │
    └──────────────────┴──────────────────┘
                       │
                       ▼
              ┌───────────────────┐
              │  Budget Critic    │  预算审计
              └───────────────────┘
                       │
              ┌───────┴───────┐
              │ 超预算?       │
              │ Yes → 重试    │
              │ No  → 完成    │
              └───────────────┘
                       │
                       ▼
              ┌───────────────────┐
              │  Finalize Agent   │  生成最终行程
              └───────────────────┘
```

### 启用方式

通过 Feature Flag 控制，在 `.env.local` 中设置：

```bash
# 启用 LangGraph 多智能体架构（默认关闭）
NEXT_PUBLIC_USE_LANGGRAPH=true
```

### 核心模块 (`lib/agents/`)

**状态定义 (`state.ts`)**
```typescript
import { TripStateAnnotation, type TripState } from '@/lib/agents'

// TripState 包含以下字段：
// - userInput: 用户输入
// - weather: 天气数据和策略标签
// - draftItinerary: 行程草稿
// - accommodation: 住宿推荐
// - transport: 交通规划
// - dining: 餐饮推荐
// - budgetResult: 预算审计结果
// - finalItinerary: 最终行程
```

**工作流执行**
```typescript
import {
  executeTripPlanningWorkflow,
  streamTripPlanningWorkflow,
  getWorkflowNodes,
} from '@/lib/agents'

// 执行工作流（返回最终状态）
const result = await executeTripPlanningWorkflow(formData, {
  config: {
    ai: { apiKey, baseURL, model },
    maxRetries: 3,
  },
})

// 流式执行（用于进度反馈）
for await (const event of streamTripPlanningWorkflow(formData)) {
  console.log('Completed:', event.node)
}

// 获取节点列表（用于 UI 显示）
const nodes = getWorkflowNodes()
// [{ id: 'weather_scout', name: '天气分析', ... }, ...]
```

**MCP 客户端 (`mcp-client.ts`)**
```typescript
import { getMCPClient } from '@/lib/agents'

const mcp = getMCPClient()

// 天气查询
const weather = await mcp.getWeatherForecast('杭州')

// POI 搜索
const pois = await mcp.searchPOI({ keywords: '西湖', city: '杭州' })

// 路线规划
const route = await mcp.getDrivingRoute(origin, destination)

// 地理编码
const location = await mcp.geocode('杭州西湖', '杭州')
```

### 前端进度监听

使用 `useLangGraphProgress` Hook 监听工作流执行进度：

```typescript
import { useLangGraphProgress } from '@/hooks/useLangGraphProgress'

function CreateTripPage() {
  const {
    isGenerating,
    progress,
    stages,
    currentStage,
    error,
    result,
    startGeneration,
    reset,
  } = useLangGraphProgress()

  const handleSubmit = async (formData) => {
    await startGeneration(formData, accessToken)
    if (result?.trip_id) {
      router.push(`/dashboard/trips/${result.trip_id}`)
    }
  }

  return (
    <div>
      {isGenerating && (
        <ProgressModal
          stages={stages}
          currentStage={currentStage}
          progress={progress}
        />
      )}
    </div>
  )
}
```

### v2 API 端点

**POST `/api/v2/generate-itinerary`**
- 支持普通 JSON 响应和 SSE 流式响应
- 根据 `Accept: text/event-stream` 头决定响应类型
- SSE 事件类型：`start`, `node_complete`, `progress`, `error`, `complete`

**GET `/api/v2/generate-itinerary`**
- 返回工作流节点列表（用于前端进度显示）

### Agent 详细说明

| Agent | 职责 | MCP 工具 |
|-------|------|----------|
| Weather Scout | 获取天气预报，输出策略标签 | `getWeatherForecast` |
| Itinerary Planner | 生成行程骨架（景点顺序） | `searchPOI`, `geocode` |
| Accommodation | 推荐酒店住宿 | `searchNearby` |
| Transport | 计算交通路线和费用 | `getDrivingRoute`, `getWalkingRoute`, `getTransitRoute` |
| Dining | 推荐餐厅 | `searchPOI` |
| Budget Critic | 预算审计，超支触发重试 | 无（纯计算） |
| Finalize | 整合数据，输出最终行程 | 无 |

### 预算审计与重试

Budget Critic Agent 会检查总成本是否在预算范围内：
- 允许 10% 的预算溢价
- 超预算时返回反馈，触发 Itinerary Planner 重新规划
- 最多重试 3 次

### 开发注意事项

1. **Feature Flag 检查**：前端通过 `appConfig.features.useLangGraph` 判断使用 v1 还是 v2 API
2. **AI 配置**：工作流会自动获取用户或系统的 AI 配置
3. **错误处理**：所有 Agent 都有完整的错误处理，失败时会记录到 `meta.errors`
4. **调试日志**：工作流执行会输出详细日志，包含节点执行时间

## 开发注意事项

### AI 模型调用
- **重要**: 检查 API Key 可用性
  - 推荐：`ApiKeyClient.getUserConfig(userId, service, supabaseClient)`
  - 回退：`ApiKeyClient.getSystemKey(service)`
  - 测试：`ApiKeyValidator.testDeepSeekKey(apiKey)`
  - 如果都不可用，返回 400 错误并提示用户配置

### 坐标处理
- AI 生成的坐标通常不准确或使用 WGS84
- 必须使用高德 API (`smartGeocode`) 或坐标转换 (`wgs84ToGcj02`)
- 地图显示前要确保所有坐标都是 GCJ-02
- 聚类优化：`optimizeItineraryByClustering()` 将相近景点安排在同一天

### 认证与 RLS
- Supabase RLS (Row Level Security) 已启用
- API 调用需要传递用户 token: `Authorization: Bearer ${token}`
- 使用 `getAuthUser(request)` 获取当前用户
- 确保 `profiles` 记录存在再插入 `trips`（外键约束）

### 离线功能
- PWA 在生产环境自动启用，开发环境需设置 `ENABLE_PWA_DEV=true`
- Service Worker 缓存策略配置在 `next.config.js`
- **重要**: `/api/health` 端点必须使用 `NetworkOnly`，不能缓存
- IndexedDB 数据库名称: `ai-travel-planner-offline`

### 进程管理
- **常见问题**: 端口 3008 被僵尸进程占用
- 使用 `npm run dev:safe` 自动解决
- 健康检查脚本: `scripts/health-check.js`
- PM2 配置: `ecosystem.config.js`（单实例，自动重启）

### 密码安全
- 密码强度验证: `lib/utils/password.ts`
- 要求：至少 8 字符、包含大小写字母和数字
- 修改密码需验证当前密码

### PDF 导出
- 支持中文字体（思源宋体）
- 字体加载: `lib/fonts/loadPdfFonts.ts`
- 导出逻辑: `lib/exportTripToPDF.ts`
- 支持打印优化版本: `app/dashboard/trips/[id]/print/page.tsx`

### 类型安全
- 所有核心类型定义在 `types/index.ts`
- 重要类型：`Trip`, `Itinerary`, `DayPlan`, `Activity`, `Expense`, `ApiKey`
- API 响应应严格遵循类型定义

## 测试与调试

### 健康检查
```bash
npm run dev:check         # 检查端口和服务器状态
```

### 工作流调试页面
开发环境下可访问工作流可视化调试页面：

**访问方式**：
1. Dashboard 顶部导航栏点击「调试」按钮
2. 直接访问 `http://localhost:3008/dashboard/debug`

**功能特性**：
- **工作流状态图**: SVG 可视化展示 LangGraph 工作流结构和节点状态
- **追踪记录列表**: 查看历史执行记录，支持状态筛选
- **执行时间线**: 按时间顺序显示各节点执行情况和耗时对比
- **状态数据查看器**: 查看工作流输入输出的 JSON 数据

**API 端点**：
- `GET /api/workflow-debug` - 获取追踪数据
- `GET /api/workflow-debug?type=graph` - 获取工作流图结构
- `GET /api/metrics` - Prometheus 格式指标
- `GET /api/metrics?format=json` - JSON 格式指标

### 查看日志
```bash
npm run logs              # PM2 日志（如果使用 PM2）
# 或查看文件: logs/pm2-error.log, logs/pm2-out.log
```

### 常见错误

#### 1. "端口被占用"
```bash
npm run cleanup           # 自动清理
# 或手动: taskkill /F /PID <pid> (Windows)
```

#### 2. "RLS 策略错误"
- 检查 Supabase RLS 策略是否正确配置
- 运行 `database/init.sql` 重新初始化
- 确保传递了正确的 Authorization header

#### 3. "地图无法显示"
- 检查 `NEXT_PUBLIC_MAP_API_KEY` 是否配置
- 确认坐标是 GCJ-02 格式
- 检查高德 API 配额是否充足

#### 4. "AI 生成失败"
- 检查用户和系统 API Keys 是否都不可用
- 查看服务器日志获取详细错误
- 确认 API 配额充足

## Git 提交规范

根据用户的 `.claude/CLAUDE.md` 配置：
- **不要包含**以下字段：
  - `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
- 提交消息应简洁明了，使用中文
- 遵循约定式提交（Conventional Commits）格式：
  - `feat:` 新功能
  - `fix:` 错误修复
  - `refactor:` 代码重构
  - `docs:` 文档更新
  - `style:` 样式调整
  - `test:` 测试相关
  - `chore:` 构建/工具相关

## 组件架构 (Phase 3 重构)

项目已完成 Phase 3 组件层优化，建立了清晰的组件层次结构和复用体系。

### 组件组织原则

1. **按功能模块分类**
   - `components/shared/` - 通用 UI 组件（跨功能使用）
   - `components/map/` - 地图相关组件
   - `components/settings/` - 设置页面组件
   - 主组件放在 `components/` 根目录

2. **单一职责原则**
   - 每个组件专注于单一功能
   - 大型组件已拆分为多个子组件
   - 避免单个文件超过 400 行

3. **高复用性**
   - 提取通用 UI 组件（PhotoCarousel, RatingDisplay 等）
   - 创建可复用的工具函数模块
   - 使用 Hooks 封装通用逻辑

### 核心共享组件

**PhotoCarousel** (`components/shared/PhotoCarousel.tsx`)
- 统一的照片轮播组件
- 支持多张图片导航、占位内容、覆盖层
- 使用示例：`<PhotoCarousel photos={photos} alt="..." />`

**RatingDisplay** (`components/shared/RatingDisplay.tsx`)
- 统一的星级评分显示
- 支持半星、可选数字评分
- 使用示例：`<RatingDisplay rating={4.5} showNumeric />`

**MapLegend** (`components/map/MapLegend.tsx`)
- 地图图例组件
- 支持可选的路线说明
- 使用示例：`<MapLegend showRoute={true} />`

**TripMapToolbar** (`components/map/TripMapToolbar.tsx`)
- 行程地图工具栏
- 天数切换、路线控制、视图折叠功能
- 可复用于不同的地图视图

### 核心工具模块

**ui-helpers.ts** - UI 常量和辅助函数
```typescript
import { getDayColor, getActivityEmoji, renderStars } from '@/lib/ui-helpers'

// 使用统一的颜色
const dayColor = getDayColor(dayNumber)  // 自动循环8种颜色

// 使用统一的 emoji
const emoji = getActivityEmoji(activity.type)

// 渲染星级评分
const stars = renderStars(rating)  // 返回星星配置数组
```

**map-markers.ts** - 地图标记工具
```typescript
import {
  calculateMapCenter,
  createMapInfoWindowContent,
  createActivityMarkerIcon,
  createAccommodationMarkerIcon
} from '@/lib/map-markers'

// 计算地图中心点
const center = calculateMapCenter(locations)

// 创建标记图标
const icon = createActivityMarkerIcon(dayNumber, indexInDay)

// 创建信息窗口
const content = createMapInfoWindowContent(location, index)
```

### Hooks 使用

**useAMapLoader** - 统一地图加载
```typescript
import { useAMapLoader } from '@/hooks/useAMapLoader'

// 使用配置文件的 API Key
const { loading, error, isLoaded } = useAMapLoader()

// 使用环境变量的 API Key
const { loading, error, isLoaded } = useAMapLoader({ apiKeySource: 'env' })

// 使用自定义 API Key
const { loading, error, isLoaded } = useAMapLoader({ apiKeySource: 'sk-xxx' })
```

**usePhotoCarousel** - 照片轮播逻辑
```typescript
import { usePhotoCarousel } from '@/hooks/usePhotoCarousel'

const { currentIndex, currentPhoto, hasPhotos, nextPhoto, prevPhoto } =
  usePhotoCarousel({ photos })
```

### 组件拆分案例

**大型组件优化成果**：
- `TripOverviewMap`: 594 → 323 行 (-45.6%)
- `ApiKeyManager`: 561 → 351 行 (-37.4%)
- `MapView`: 484 → 401 行 (-17.1%)

**拆分策略**：
1. 提取工具栏/头部为独立组件
2. 提取重复的 UI 片段为共享组件
3. 将内联工具函数移至工具模块
4. 使用 Hooks 封装复杂逻辑

### 开发最佳实践

1. **优先使用共享组件**
   - 使用 PhotoCarousel 而非自己实现轮播
   - 使用 RatingDisplay 而非自己渲染星星
   - 使用 InfoBox 而非重复写提示框

2. **优先使用工具函数**
   - 使用 `getDayColor()` 而非硬编码颜色
   - 使用 `getActivityEmoji()` 而非 switch 语句
   - 使用 `renderStars()` 而非自己计算星星

3. **优先使用 Hooks**
   - 使用 `useAMapLoader` 而非手动加载地图
   - 使用 `usePhotoCarousel` 而非重复实现轮播逻辑

4. **组件文件大小控制**
   - 单个组件文件不超过 400 行
   - 超过后考虑拆分子组件或提取工具函数

5. **类型安全**
   - 使用统一导出的类型（如 MapLocation）
   - 为所有组件和函数添加 TypeScript 类型

### 重构文档

详细的重构过程和成果见：
- `docs/PHASE_3_COMPLETION_REPORT.md` - Phase 3 完成报告

## 性能优化

### 前端
- 使用 Zustand 管理全局状态（避免 Context 重渲染）
- IndexedDB 用于离线数据缓存
- Service Worker 缓存静态资源
- 图片使用 Next.js Image 组件优化
- 组件粒度优化，便于代码分割和懒加载

### 后端
- 高德 API 调用限制（每次生成最多 30 次）
- 添加延迟避免 API 限流（300ms）
- 数据库索引：`user_id`, `trip_id`, `updated_at`
- Supabase 连接池管理

### AI 调用
- 设置合理的 `max_tokens`
- 使用流式响应（如果需要）
- 缓存常用提示词模板

## 部署

### Vercel (推荐)
- 自动检测 Next.js 项目
- 配置环境变量
- 设置 `NEXT_PUBLIC_BASE_URL` 为实际域名

### Docker
- Dockerfile 已配置 standalone 输出
- 参考 `docs/DOCKER_DEPLOYMENT.md`

### 环境变量检查清单
- [ ] Supabase URL 和 Keys
- [ ] DeepSeek API Key (必需)
- [ ] 高德地图 API Keys (必需)
- [ ] ENCRYPTION_KEY (至少 32 字符)
- [ ] NEXT_PUBLIC_BASE_URL (生产环境域名)

## 文档参考

项目包含详细的功能文档，位于 `docs/` 目录：

### 用户指南
- `QUICK_START.md` - 快速启动指南
- `SETTINGS_GUIDE.md` - 用户设置指南
- `OFFLINE_USAGE.md` - 离线功能用户指南

### 技术文档
- `PROCESS_MANAGEMENT.md` - 进程管理详解
- `MAP_INTEGRATION.md` - 地图集成说明
- `DATABASE_SETUP.md` - 数据库设置
- `PWA_IMPLEMENTATION.md` - PWA 技术实现
- `DEPLOYMENT.md` - 部署指南

### 重构文档
- `PHASE_3_COMPLETION_REPORT.md` - Phase 3 组件层重构完成报告
- `多智能体架构升级计划.md` - LangGraph 多智能体架构设计与实施计划
- 包含详细的重构过程、代码统计、最佳实践

遇到问题时，优先查阅对应功能的文档。
- 不要擅自启动服务器，我自己来手动启动服务器就可以