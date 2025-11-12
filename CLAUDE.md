# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI 旅行规划师 - 基于 Next.js 15 的全栈 AI 旅行规划 Web 应用，支持多 AI 模型、语音输入、离线缓存、PWA 等功能。

## 核心技术栈

- **框架**: Next.js 15 (App Router + TypeScript)
- **认证/数据库**: Supabase (PostgreSQL + RLS 行级安全)
- **AI 模型**: DeepSeek (OpenAI 兼容 API) + ModelScope (Qwen 系列)
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
│   ├── generate-itinerary/       # 核心：AI 行程生成
│   ├── user/                     # 用户相关（profile/password/api-keys）
│   ├── trips/[id]/               # 行程 CRUD + 分享功能
│   ├── expenses/                 # 费用追踪
│   ├── enrich-attraction/        # 景点信息增强（高德 POI）
│   ├── enrich-hotel/             # 酒店信息增强
│   └── weather/                  # 天气预报
├── dashboard/                    # 主应用页面
│   ├── create/                   # 创建行程表单
│   ├── settings/                 # 用户设置页面
│   └── trips/[id]/               # 行程详情 + 打印页面
└── share/[token]/                # 公开分享页面

lib/
├── supabase.ts                   # Supabase 客户端 + 数据库辅助函数
├── models.ts                     # AI 模型配置
├── config.ts                     # 环境变量配置管理
├── encryption.ts                 # AES-256 加密（用于 API Keys）
├── api-keys.ts                   # API Keys 获取/解密逻辑
├── offline.ts                    # IndexedDB 离线数据管理
├── sync.ts                       # 数据同步引擎
├── amap-geocoding.ts             # 高德地图地理编码
├── coordinate-converter.ts       # WGS84 <-> GCJ-02 坐标转换
├── geo-clustering.ts             # 地理位置聚类优化
├── exportTripToPDF.ts            # PDF 导出核心逻辑
└── stores/theme-store.ts         # Zustand 主题状态管理

types/index.ts                    # 核心类型定义
database/init.sql                 # Supabase 数据库初始化脚本
```

### 核心数据流

#### 1. 行程生成流程
1. 用户在 `app/dashboard/create` 填写表单
2. 提交到 `app/api/generate-itinerary/route.ts`
3. 获取用户 API Keys（优先用户自定义，否则用系统默认）
4. 调用 DeepSeek/ModelScope API 生成行程 JSON
5. 坐标修正：使用高德 API 获取准确的 GCJ-02 坐标
6. 地理聚类优化：将相近景点安排在同一天
7. 保存到 Supabase `trips` 表
8. 重定向到行程详情页

#### 2. 离线数据同步
- 使用 IndexedDB 存储行程和费用数据（`lib/offline.ts`）
- 监听网络状态，离线时将修改操作加入同步队列
- 网络恢复后自动执行同步队列（`lib/sync.ts`）
- 冲突解决：Last-Write-Wins 策略（基于 `updated_at`）

#### 3. API Keys 管理
- 用户可在设置页面添加自己的 DeepSeek/ModelScope/高德 API Keys
- 存储时使用 AES-256 加密（`lib/encryption.ts`）
- 调用 API 时优先使用用户 Keys（`lib/api-keys.ts`）
- 支持配置自定义 `base_url` 和额外配置（`extra_config`）

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

## 开发注意事项

### AI 模型调用
- **重要**: 检查 API Key 可用性
  - 用户 Keys: `getUserApiKeyConfig(userId, service, supabaseClient)`
  - 系统 Keys: `config.deepseek.apiKey` / `config.modelscope.apiKey`
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

## 性能优化

### 前端
- 使用 Zustand 管理全局状态（避免 Context 重渲染）
- IndexedDB 用于离线数据缓存
- Service Worker 缓存静态资源
- 图片使用 Next.js Image 组件优化

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
- 参考 `DOCKER_DEPLOYMENT.md`

### 环境变量检查清单
- [ ] Supabase URL 和 Keys
- [ ] DeepSeek API Key (必需)
- [ ] 高德地图 API Keys (必需)
- [ ] ENCRYPTION_KEY (至少 32 字符)
- [ ] NEXT_PUBLIC_BASE_URL (生产环境域名)

## 文档参考

项目包含详细的功能文档，位于 `docs/` 目录：
- `QUICK_START.md` - 快速启动指南
- `PROCESS_MANAGEMENT.md` - 进程管理详解
- `MAP_INTEGRATION.md` - 地图集成说明
- `DATABASE_SETUP.md` - 数据库设置
- `SETTINGS_GUIDE.md` - 用户设置指南
- `PWA_IMPLEMENTATION.md` - PWA 技术实现
- `OFFLINE_USAGE.md` - 离线功能用户指南
- `DEPLOYMENT.md` - 部署指南

遇到问题时，优先查阅对应功能的文档。
