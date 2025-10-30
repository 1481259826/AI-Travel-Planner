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
- **📱 PWA 支持** - 安装到主屏幕，像原生应用一样使用
- **💾 离线缓存** - 查看和编辑已缓存的行程，支持离线访问（[查看文档](docs/OFFLINE_USAGE.md)）
- **⚙️ 用户设置** - 账户管理、密码修改、主题切换、API Keys 管理（[查看文档](docs/SETTINGS_GUIDE.md)）
- **📄 PDF 导出** - 导出行程为 PDF 文档，支持打印优化版本，完美支持中文
- **🔧 进程管理** - 自动检测和清理僵尸进程，支持 PM2 生产级管理（[查看文档](docs/PROCESS_MANAGEMENT.md)）

### 计划功能

- 百度地图支持
- 多币种支持
- 费用预测分析
- 分享访问统计
- 离线创建新行程
- 推送通知

## 🚀 快速开始

> 💡 **推荐启动方式**: 使用 `npm run dev:safe` 安全启动，自动避免僵尸进程问题。详见 [快速启动指南](docs/QUICK_START.md)。

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

# 数据加密密钥（必需 - 用于 API Key 加密存储）
ENCRYPTION_KEY=your_32_char_or_longer_encryption_key_here

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

**加密密钥 (必需):**
使用 Node.js 生成安全的随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
⚠️ 密钥至少 32 个字符，不要将密钥提交到版本控制

### 3. 设置数据库

在 Supabase SQL Editor 中运行统一的数据库初始化脚本：

```bash
# 复制 database/init.sql 的全部内容到 Supabase SQL Editor 并执行
# 一次性完成所有数据库设置，包含：
# - 4 个核心表：profiles、trips、expenses、api_keys
# - 完整的 RLS 安全策略
# - 性能优化索引
# - 自动更新触发器
# - 用户设置功能（主题、默认偏好、API Keys 加密存储）
```

**已有项目？** 无需担心！脚本包含向后兼容逻辑，会自动检测并添加缺失字段，安全升级数据库到最新版本。

### 4. 启动项目

**推荐方式（自动处理僵尸进程）：**
```bash
npm run dev:safe
```

**标准方式：**
```bash
npm run dev
```

**生产级管理（需要 PM2）：**
```bash
npm install -g pm2
npm run dev:pm2
```

访问 http://localhost:3008

**注意**：
- 默认端口为 3008，可在 `package.json` 中修改
- 更多启动选项和进程管理，请查看 [进程管理指南](docs/PROCESS_MANAGEMENT.md)

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

### 用户设置

1. **进入设置** - 点击 Dashboard 右上角的「设置」按钮
2. **账户信息** - 修改用户名、头像
3. **安全设置** - 修改密码（带强度验证）
4. **偏好设置**：
   - 选择主题（浅色/深色/跟随系统）
   - 设置默认 AI 模型
   - 设置默认预算和出发地
5. **API Keys 管理**：
   - 添加您自己的 Anthropic/DeepSeek/高德地图 API Keys
   - 系统将优先使用您的 Keys（AES-256 加密存储）
   - 测试 Key 有效性，管理多个备用 Keys

详细说明请查看 [docs/SETTINGS_GUIDE.md](docs/SETTINGS_GUIDE.md)

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
- **PWA**: next-pwa + Workbox
- **离线存储**: IndexedDB (idb)
- **PDF 生成**: jsPDF + jspdf-autotable + html2canvas
- **图表**: Recharts

### 后端
- **认证与数据库**: Supabase (PostgreSQL + RLS)
- **API**: Next.js API Routes

### AI 集成
- **大语言模型**: Claude (Anthropic) + DeepSeek
- **语音识别**: Web Speech API

### 开发工具
- **进程管理**: PM2（生产级进程管理）
- **健康监控**: 自定义健康检查脚本
- **加密**: crypto-js（AES-256 加密）
- **日期处理**: date-fns

## 📁 项目结构

```
ai-travel-planner/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── generate-itinerary/   # 行程生成 API
│   │   ├── expenses/             # 费用管理 API
│   │   ├── user/                 # 用户相关 API
│   │   │   ├── profile/          # 用户配置
│   │   │   ├── password/         # 密码修改
│   │   │   └── api-keys/         # API Keys 管理
│   │   └── trips/                # 行程相关 API
│   │       ├── [id]/share/       # 分享链接管理
│   │       └── share/[token]/    # 获取公开行程
│   ├── dashboard/                # 仪表板页面
│   │   ├── create/              # 创建行程
│   │   ├── settings/            # 用户设置
│   │   └── trips/[id]/          # 行程详情
│   │       └── print/           # 打印优化页面
│   ├── share/[token]/           # 公开分享页面
│   ├── login/                   # 登录页面
│   ├── register/                # 注册页面
│   ├── providers.tsx            # 全局 Provider（主题等）
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── ui/                      # UI 基础组件
│   │   ├── checkbox.tsx         # 复选框组件
│   │   └── dialog.tsx           # 对话框组件
│   ├── settings/                # 设置页面组件
│   │   ├── ProfileForm.tsx      # 账户信息表单
│   │   ├── PasswordChangeForm.tsx # 密码修改表单
│   │   ├── PreferencesForm.tsx  # 偏好设置表单
│   │   ├── ApiKeyManager.tsx    # API Keys 管理
│   │   └── AddApiKeyModal.tsx   # 添加 Key 模态框
│   ├── VoiceInput.tsx           # 语音输入组件
│   ├── ModelSelector.tsx        # 模型选择器
│   ├── ThemeToggle.tsx          # 主题切换组件
│   ├── MapView.tsx              # 地图显示组件
│   ├── ShareButton.tsx          # 分享按钮组件
│   ├── ExpenseForm.tsx          # 费用表单
│   ├── ExpenseList.tsx          # 费用列表
│   ├── BudgetChart.tsx          # 预算图表
│   ├── ExportPdfButton.tsx      # PDF 导出按钮
│   ├── ExportPdfDialog.tsx      # PDF 导出对话框
│   ├── OfflineIndicator.tsx    # 离线状态指示器
│   ├── SyncStatus.tsx           # 同步状态组件
│   ├── InstallPrompt.tsx        # PWA 安装提示
│   └── CacheManager.tsx         # 缓存管理器
├── hooks/                       # React Hooks
│   ├── useOfflineTrips.ts       # 离线行程数据获取
│   ├── useOfflineTrip.ts        # 单个行程离线获取
│   └── useSync.ts               # 同步状态管理
├── lib/                         # 工具库
│   ├── stores/                  # 状态管理
│   │   └── theme-store.ts       # 主题状态
│   ├── utils/                   # 工具函数
│   │   └── password.ts          # 密码验证
│   ├── fonts/                   # 字体文件
│   │   └── loadPdfFonts.ts      # PDF 字体加载
│   ├── config.ts                # 配置管理
│   ├── models.ts                # AI 模型配置
│   ├── supabase.ts              # Supabase 客户端
│   ├── auth-helpers.ts          # 认证辅助函数
│   ├── encryption.ts            # AES-256 加密工具
│   ├── api-keys.ts              # API Keys 工具函数
│   ├── share.ts                 # 分享功能工具
│   ├── offline.ts               # IndexedDB 离线数据管理
│   ├── sync.ts                  # 数据同步引擎
│   ├── analytics.ts             # 分析工具
│   ├── exportTripToPDF.ts       # PDF 导出核心逻辑
│   └── pdfHelpers.ts            # PDF 辅助函数
├── types/                       # TypeScript 类型
│   └── pdf.ts                   # PDF 相关类型定义
├── docs/                        # 项目文档
│   ├── README.md                # 文档索引
│   ├── QUICK_START.md           # 快速启动指南
│   ├── PROCESS_MANAGEMENT.md    # 进程管理指南
│   ├── MODEL_SELECTION.md       # 模型选择说明
│   ├── MAP_INTEGRATION.md       # 地图集成说明
│   ├── DATABASE_SETUP.md        # 数据库设置指南
│   ├── BUDGET_VISUALIZATION.md  # 费用可视化说明
│   ├── SHARE_FEATURE.md         # 分享功能说明
│   ├── SETTINGS_GUIDE.md        # 设置功能使用指南
│   ├── PWA_IMPLEMENTATION.md    # PWA 技术实现文档
│   ├── OFFLINE_USAGE.md         # 离线功能用户指南
│   ├── DEPLOYMENT.md            # 部署指南
│   └── archive/                 # 历史文档归档
├── scripts/                     # 脚本工具
│   ├── health-check.js          # 健康检查脚本
│   ├── dev-safe.sh              # 安全启动（Linux/Mac）
│   ├── dev-safe.bat             # 安全启动（Windows）
│   ├── generate-better-icons.js # 图标生成工具
│   └── svg-to-png.js            # SVG 转 PNG 工具
├── database/                    # 数据库脚本
│   ├── README.md                # 数据库说明
│   └── init.sql                 # 统一数据库初始化脚本 (v3.0)
├── public/                      # 静态资源
│   ├── manifest.json            # PWA manifest 文件
│   └── icons/                   # PWA 应用图标
│       └── README.md            # 图标生成说明
├── logs/                        # 日志目录（PM2 使用）
├── ecosystem.config.js          # PM2 配置文件
└── .env.example                 # 环境变量模板
```

## 🗄️ 数据库结构

### profiles 表
用户配置信息（扩展 Supabase auth.users）
- 基本信息：email、name、avatar_url
- 主题设置：theme (light/dark/system)
- 默认偏好：default_model、default_budget、default_origin

### trips 表
- 基本信息：origin（出发地）、destination（目的地）、日期、预算、人数
- 行程数据：itinerary (JSONB)
- 状态：draft/planned/ongoing/completed
- 分享：share_token（分享标识）、is_public（是否公开）

### expenses 表
- 分类：accommodation/transportation/food/attractions/shopping/other
- 关联：trip_id
- 字段：amount（金额）、description（描述）、date（日期）

### api_keys 表
- 用户自定义 API Keys（AES-256 加密存储）
- 服务类型：anthropic / deepseek / map
- 字段：encrypted_key（加密密钥）、key_prefix（显示前缀）、is_active（是否激活）

详细的数据库设置请查看 [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

## 🚀 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

详细步骤请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 📱 PWA 和离线功能

### 安装 PWA

应用支持安装到设备主屏幕，像原生应用一样使用。

**手机端（Android/iOS）**：
1. 使用 Chrome/Safari 访问应用
2. 点击页面顶部的"安装 AI 旅行规划"横幅
3. 或通过浏览器菜单选择"添加到主屏幕"

**桌面端（Chrome/Edge）**：
1. 访问应用
2. 点击地址栏的安装图标
3. 确认安装

### 使用离线功能

**准备离线使用**（需要网络）：
1. 登录账号
2. 访问您想离线查看的行程
3. 等待右下角显示"已同步"

**离线访问**（无需网络）：
- ✅ 查看已缓存的行程详情
- ✅ 编辑行程信息
- ✅ 查看费用记录
- ✅ 查看地图（需事先加载）

**数据同步**：
- 网络恢复后自动同步离线编辑
- 右下角显示同步状态和进度
- 支持手动触发同步

### 缓存管理

在 Dashboard 点击"缓存"按钮可以：
- 查看缓存统计
- 清除本地缓存
- 刷新数据

### 详细文档

- **技术实现**: [docs/PWA_IMPLEMENTATION.md](docs/PWA_IMPLEMENTATION.md)
- **用户指南**: [docs/OFFLINE_USAGE.md](docs/OFFLINE_USAGE.md)

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

### 端口被占用或僵尸进程？
- 使用 `npm run dev:check` 检查健康状态
- 使用 `npm run cleanup` 自动清理僵尸进程
- 推荐使用 `npm run dev:safe` 启动，自动处理端口问题
- 查看 [docs/PROCESS_MANAGEMENT.md](docs/PROCESS_MANAGEMENT.md) 获取详细说明

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**注意**: 本项目处于活跃开发中。生产环境部署前请确保完成安全审计和性能测试。
