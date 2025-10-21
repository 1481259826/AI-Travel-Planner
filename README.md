# AI 旅行规划师 (AI Travel Planner)

一个基于 AI 技术的智能旅行规划 Web 应用，支持多模型选择、语音输入、智能行程生成、费用管理等功能。

## ✨ 功能特性

### 已实现功能

- **🎤 语音输入** - 基于 Web Speech API 的语音识别，支持中文语音输入
- **🤖 多 AI 模型支持** - 支持 Claude Haiku 4.5、Claude 3.5 Sonnet、DeepSeek Chat
- **📋 智能行程规划** - AI 生成详细旅行计划，包含每日行程、景点推荐、餐厅推荐
- **💰 费用预估** - 智能预算分析和费用估算
- **🔐 用户认证** - Supabase 认证集成，支持邮箱/密码注册登录
- **📊 行程管理** - 创建、保存和查看多个旅行计划
- **🗺️ 地图集成** - 高德地图显示景点位置、路线规划（[查看文档](docs/MAP_INTEGRATION.md)）

### 计划功能

- 费用追踪系统（语音录入开销）
- 数据可视化（预算对比图表）
- 行程分享功能
- 离线缓存支持
- 百度地图支持

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

然后填入以下信息：

```env
# Supabase（必需）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic Claude API（必需）
ANTHROPIC_API_KEY=your_anthropic_api_key
BASE_URL=https://api.anthropic.com

# DeepSeek API（可选）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 高德地图 API（必需 - 用于行程地图显示）
NEXT_PUBLIC_MAP_API_KEY=your_amap_api_key

# 其他可选服务
VOICE_API_KEY=your_voice_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

#### 获取 API Key

**Supabase:**
1. 访问 [supabase.com](https://supabase.com) 创建项目
2. 进入 Settings → API 复制 URL 和 anon key

**Anthropic Claude:**
1. 访问 [console.anthropic.com](https://console.anthropic.com)
2. 创建 API Key

**DeepSeek (可选):**
1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 创建 API Key

**高德地图 (必需):**
1. 访问 [lbs.amap.com](https://lbs.amap.com)
2. 创建应用并获取 Web 端（JS API）Key
3. 详细说明查看 [docs/MAP_INTEGRATION.md](docs/MAP_INTEGRATION.md)

### 3. 设置数据库

在 Supabase SQL Editor 中运行初始化脚本：

**新项目（推荐）：**
```bash
运行 supabase-init.sql - 一键完成所有表、策略、索引的创建
```

**旧项目升级：**
```bash
运行 supabase-add-origin.sql - 仅添加出发地字段
```

### 4. 启动项目

```bash
npm run dev
```

访问 http://localhost:3000

## 📖 使用指南

### 创建行程

1. **注册/登录** - 首次使用需要注册账号
2. **创建新行程** - 点击"创建新行程"按钮
3. **填写信息**：
   - **出发地**（支持语音输入）- 用于准确估算交通费用
   - **目的地**（支持语音输入）
   - 出发和返回日期
   - 预算金额
   - 出行人数
   - 旅行偏好
   - 选择 AI 模型
4. **生成行程** - 点击"生成旅行计划"，AI 将在几秒内生成详细行程
5. **查看详情** - 自动跳转到行程详情页，查看完整计划和地图

### AI 模型选择

本项目支持多个 AI 模型，可根据需求选择：

- **Claude Haiku 4.5** - 快速且经济，适合日常使用
- **Claude 3.5 Sonnet** - 平衡性能和成本，推荐使用
- **DeepSeek Chat** - 中文支持优秀，适合中文旅行规划

详细说明请查看 [docs/MODEL_SELECTION.md](docs/MODEL_SELECTION.md)

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **状态管理**: Zustand

### 后端
- **认证与数据库**: Supabase (PostgreSQL + RLS)
- **API**: Next.js API Routes

### AI 集成
- **大语言模型**: Claude (Anthropic) + DeepSeek
- **语音识别**: Web Speech API

## 📁 项目结构

```
ai-travel-planner/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   └── generate-itinerary/   # 行程生成 API
│   ├── dashboard/                # 仪表板页面
│   │   ├── create/              # 创建行程
│   │   └── trips/[id]/          # 行程详情
│   ├── login/                   # 登录页面
│   ├── register/                # 注册页面
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── ui/                      # UI 基础组件
│   ├── VoiceInput.tsx           # 语音输入组件
│   ├── ModelSelector.tsx        # 模型选择器
│   └── MapView.tsx              # 地图显示组件
├── lib/                         # 工具库
│   ├── config.ts                # 配置管理
│   ├── models.ts                # AI 模型配置
│   ├── supabase.ts              # Supabase 客户端
│   └── auth-helpers.ts          # 认证辅助函数
├── types/                       # TypeScript 类型
├── docs/                        # 文档
│   ├── MODEL_SELECTION.md       # 模型选择说明
│   ├── MAP_INTEGRATION.md       # 地图集成说明
│   ├── DATABASE_SETUP.md        # 数据库设置指南
│   ├── ORIGIN_FIELD_UPDATE.md   # 出发地功能说明
│   └── Create_Prompt.md         # 原始需求文档
├── supabase-init.sql            # 数据库初始化脚本（推荐）
├── supabase-add-origin.sql      # 添加出发地字段（升级用）
└── .env.example                 # 环境变量模板
```

## 🗄️ 数据库结构

### profiles 表
用户配置信息（扩展 Supabase auth.users）

### trips 表
- 基本信息：目的地、日期、预算、人数
- 行程数据：itinerary (JSONB)
- 状态：draft/planned/ongoing/completed

### expenses 表
- 分类：accommodation/transportation/food/attractions/shopping/other
- 关联：trip_id

## 🚀 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

详细步骤请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## ❓ 常见问题

### 语音输入不可用？
- 确保使用 HTTPS 或 localhost
- 使用支持的浏览器（Chrome/Edge/Safari）
- 授权麦克风权限

### AI 生成失败？
- 检查 API Key 是否正确
- 确认 API 配额充足
- 查看服务器日志获取详细错误

### 数据库保存失败？
- 确保运行了 `supabase-fix-profiles.sql`
- 检查 RLS 策略是否启用
- 确认用户已登录

### 地图无法显示？
- 检查是否配置了 `NEXT_PUBLIC_MAP_API_KEY`
- 确认 API Key 是否正确
- 查看 [docs/MAP_INTEGRATION.md](docs/MAP_INTEGRATION.md) 获取详细配置说明

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**注意**: 本项目处于活跃开发中。生产环境部署前请确保完成安全审计和性能测试。
