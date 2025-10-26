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
- **💵 费用追踪** - 语音录入开销、实时预算对比、费用分类管理
- **📈 数据可视化** - 预算使用图表、费用分布分析、每日开销趋势（[查看文档](docs/BUDGET_VISUALIZATION.md)）
- **🔗 行程分享** - 生成分享链接、二维码、支持社交媒体分享（[查看文档](docs/SHARE_FEATURE.md)）

### 计划功能

- 离线缓存支持
- 百度地图支持
- 多币种支持
- 费用预测分析
- 分享访问统计

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
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # 分享功能必需

# Anthropic Claude API（必需）
ANTHROPIC_API_KEY=your_anthropic_api_key
BASE_URL=https://api.anthropic.com

# DeepSeek API（可选）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 高德地图 API（必需 - 用于行程地图显示）
NEXT_PUBLIC_MAP_API_KEY=your_amap_api_key

# 应用配置
NEXT_PUBLIC_BASE_URL=http://localhost:3008  # 开发环境；生产环境改为实际域名

# 其他可选服务
VOICE_API_KEY=your_voice_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

#### 获取 API Key

**Supabase:**
1. 访问 [supabase.com](https://supabase.com) 创建项目
2. 进入 Settings → API
3. 复制以下密钥：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ 保密！仅服务端使用

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

```bash
# 复制 database/init.sql 的全部内容到 Supabase SQL Editor 并执行
# 脚本包含所有功能：基础表 + 分享功能 + 费用追踪 + RLS 策略
```

**已有项目？** 无需担心！脚本包含向后兼容逻辑，会自动检测并添加缺失字段。

### 4. 启动项目

```bash
npm run dev
```

访问 http://localhost:3008

**注意**：默认端口为 3008，可在 `package.json` 中修改

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

### 分享行程

1. **打开行程详情** - 进入想要分享的行程页面
2. **点击分享按钮** - 点击顶部的"分享行程"按钮
3. **开启公开分享** - 打开"公开分享"开关
4. **获取分享链接** - 系统自动生成唯一的分享链接
5. **分享给他人**：
   - 复制链接直接分享
   - 显示二维码供扫描
   - 分享到社交媒体（微信、微博、Twitter）
6. **管理分享** - 随时可以关闭公开分享或重新开启

详细说明请查看 [docs/SHARE_FEATURE.md](docs/SHARE_FEATURE.md)

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
│   │   ├── generate-itinerary/   # 行程生成 API
│   │   ├── expenses/             # 费用管理 API
│   │   └── trips/                # 行程相关 API
│   │       ├── [id]/share/       # 分享链接管理
│   │       └── share/[token]/    # 获取公开行程
│   ├── dashboard/                # 仪表板页面
│   │   ├── create/              # 创建行程
│   │   └── trips/[id]/          # 行程详情
│   ├── share/[token]/           # 公开分享页面
│   ├── login/                   # 登录页面
│   ├── register/                # 注册页面
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── ui/                      # UI 基础组件
│   ├── VoiceInput.tsx           # 语音输入组件
│   ├── ModelSelector.tsx        # 模型选择器
│   ├── MapView.tsx              # 地图显示组件
│   ├── ShareButton.tsx          # 分享按钮组件
│   ├── ExpenseForm.tsx          # 费用表单
│   ├── ExpenseList.tsx          # 费用列表
│   └── BudgetChart.tsx          # 预算图表
├── lib/                         # 工具库
│   ├── config.ts                # 配置管理
│   ├── models.ts                # AI 模型配置
│   ├── supabase.ts              # Supabase 客户端
│   ├── auth-helpers.ts          # 认证辅助函数
│   └── share.ts                 # 分享功能工具
├── types/                       # TypeScript 类型
├── docs/                        # 项目文档
│   ├── README.md                # 文档索引
│   ├── MODEL_SELECTION.md       # 模型选择说明
│   ├── MAP_INTEGRATION.md       # 地图集成说明
│   ├── DATABASE_SETUP.md        # 数据库设置指南
│   ├── BUDGET_VISUALIZATION.md  # 费用可视化说明
│   ├── SHARE_FEATURE.md         # 分享功能说明
│   ├── DEPLOYMENT.md            # 部署指南
│   └── archive/                 # 历史文档归档
├── database/                    # 数据库脚本
│   ├── README.md                # 数据库说明
│   └── init.sql                 # 完整数据库初始化脚本
└── .env.example                 # 环境变量模板
```

## 🗄️ 数据库结构

### profiles 表
用户配置信息（扩展 Supabase auth.users）

### trips 表
- 基本信息：origin（出发地）、destination（目的地）、日期、预算、人数
- 行程数据：itinerary (JSONB)
- 状态：draft/planned/ongoing/completed
- 分享：share_token（分享标识）、is_public（是否公开）

### expenses 表
- 分类：accommodation/transportation/food/attractions/shopping/other
- 关联：trip_id
- 字段：amount（金额）、description（描述）、date（日期）

详细的数据库设置请查看 [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

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
- 确保运行了 `database/init.sql` 初始化脚本
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
