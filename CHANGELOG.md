# 更新日志

本文档记录 AI 旅行规划师项目的所有重要变更。

## [Unreleased]

### 计划功能
- 行程详情页面（地图展示）
- 地图服务集成（高德/百度）
- 费用追踪系统
- 数据可视化图表
- 行程分享功能
- PWA 支持
- 离线缓存

## [0.1.0] - 2025-10-20

### 新增功能

#### 核心功能
- ✅ **用户认证系统**
  - 邮箱/密码注册
  - 邮箱/密码登录
  - 会话管理
  - 受保护路由

- ✅ **语音输入功能**
  - Web Speech API 集成
  - 中文语音识别
  - 实时语音转文字
  - 支持目的地和补充说明语音输入

- ✅ **AI 行程规划**
  - Claude 3.5 Sonnet 集成
  - 详细行程生成
  - 包含每日活动、餐厅推荐
  - 住宿和交通建议
  - 智能预算估算

- ✅ **行程管理**
  - 创建行程表单
  - 行程列表展示
  - 状态管理（草稿/已计划/进行中/已完成）
  - 多偏好标签选择

#### 技术实现
- ✅ Next.js 15 + App Router
- ✅ TypeScript 支持
- ✅ Tailwind CSS 样式系统
- ✅ Supabase 认证和数据库
- ✅ Row Level Security (RLS)
- ✅ API 路由
- ✅ 响应式设计

#### 数据库
- ✅ profiles 表（用户配置）
- ✅ trips 表（旅行计划）
- ✅ expenses 表（费用记录）
- ✅ RLS 策略
- ✅ 自动触发器
- ✅ 索引优化

### 改进

#### API 配置
- ✅ 支持自定义 `BASE_URL`（API 代理）
- ✅ 统一配置管理（`lib/config.ts`）
- ✅ 环境变量改进：
  - `CLAUDE_API_KEY` → `ANTHROPIC_API_KEY`
  - 新增 `BASE_URL` 支持

#### 认证流程
- ✅ 改进服务端认证（`lib/auth-helpers.ts`）
- ✅ 客户端会话管理
- ✅ API 请求自动携带认证令牌
- ✅ 错误处理优化

#### 文档
- ✅ 完整的 README.md
- ✅ 快速开始指南（QUICKSTART.md）
- ✅ 部署指南（DEPLOYMENT.md）
- ✅ 环境变量示例（.env.example）
- ✅ 数据库 Schema（supabase-schema.sql）

### 文件结构

```
ai-travel-planner/
├── app/
│   ├── api/
│   │   └── generate-itinerary/
│   │       └── route.ts          # AI 行程生成 API
│   ├── dashboard/
│   │   ├── create/
│   │   │   └── page.tsx          # 创建行程页面
│   │   └── page.tsx              # 仪表板
│   ├── login/
│   │   └── page.tsx              # 登录页面
│   ├── register/
│   │   └── page.tsx              # 注册页面
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── globals.css               # 全局样式
├── components/
│   ├── ui/                       # UI 基础组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   └── VoiceInput.tsx            # 语音输入组件
├── lib/
│   ├── supabase.ts               # Supabase 客户端
│   ├── auth-helpers.ts           # 认证辅助函数
│   └── config.ts                 # 统一配置管理
├── hooks/
│   └── useAuth.ts                # 认证 Hook
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── supabase-schema.sql           # 数据库迁移脚本
├── README.md                     # 项目文档
├── QUICKSTART.md                 # 快速开始指南
├── DEPLOYMENT.md                 # 部署指南
├── CHANGELOG.md                  # 更新日志
├── .env.example                  # 环境变量示例
├── package.json                  # 依赖配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.ts            # Tailwind 配置
└── next.config.js                # Next.js 配置
```

### 依赖包

#### 核心依赖
- next@^15.1.4
- react@^18.3.1
- react-dom@^18.3.1
- typescript@^5.7.3

#### 功能依赖
- @supabase/supabase-js@^2.48.1 - 认证和数据库
- @anthropic-ai/sdk@^0.32.1 - Claude AI 集成
- lucide-react@^0.469.0 - 图标库
- date-fns@^4.1.0 - 日期处理
- zustand@^5.0.3 - 状态管理
- recharts@^2.15.0 - 图表库

#### 开发依赖
- tailwindcss@^3.4.17 - CSS 框架
- autoprefixer@^10.4.20 - CSS 后处理
- eslint@^9.18.0 - 代码检查

### 已知问题

1. **行程详情页未实现**
   - 当前创建行程后会跳转到 `/dashboard/trips/[id]`
   - 该页面尚未创建
   - 临时解决方案：在仪表板查看行程列表

2. **语音输入浏览器限制**
   - 仅支持 Chrome、Edge、Safari
   - 需要 HTTPS 或 localhost
   - 部分浏览器可能需要用户手动授权

3. **地图功能未集成**
   - 行程数据包含经纬度信息
   - 地图展示功能待开发

4. **费用追踪未实现**
   - 数据库表已创建
   - UI 和逻辑待开发

### 配置变更

#### 环境变量更新
- 移除：`CLAUDE_API_KEY`
- 新增：`ANTHROPIC_API_KEY`
- 新增：`BASE_URL`（API 代理支持）

#### 迁移指南
如果你使用旧版配置：
```bash
# 旧配置
CLAUDE_API_KEY=sk-ant-xxx

# 新配置
ANTHROPIC_API_KEY=sk-ant-xxx
BASE_URL=https://api.anthropic.com
```

### 安全更新

- ✅ 实现服务端用户认证
- ✅ 环境变量安全管理
- ✅ RLS 策略保护数据
- ✅ API 请求认证验证

### 性能优化

- ✅ Next.js 15 性能优化
- ✅ 数据库索引
- ✅ TypeScript 严格模式
- ✅ 组件代码分割

## 版本说明

版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

## 贡献

欢迎提交 Issue 和 Pull Request！

查看 [README.md](./README.md) 了解更多信息。

---

**最后更新**: 2025-10-20
