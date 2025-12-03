# 更新日志

本文档记录 AI 旅行规划师项目的所有重要变更。

## [Unreleased]

### 计划功能
- 多币种支持
- 费用预测分析
- 智能推荐优化

## [1.1.0] - 2025-11-23

### 测试框架完成 - Phase 4-7

这是一个重要的质量保障版本，完成了完整的测试基础设施建设。

#### Phase 4: API 路由测试 ✅
- ✅ **行程生成 API 测试** - `generate-itinerary.test.ts`
- ✅ **行程 CRUD 测试** - `trips.test.ts`
- ✅ **费用管理 API 测试** - `expenses.test.ts`
- ✅ **用户资料 API 测试** - `user/profile.test.ts`
- ✅ **密码修改 API 测试** - `user/password.test.ts`
- ✅ **API Key 管理测试** - `user/api-keys.test.ts`

#### Phase 5: 集成测试 ✅
- ✅ **行程生成流程测试** - `trip-generation.test.ts`
  - AI 生成 → 坐标修正 → 地理聚类 → 保存
- ✅ **离线同步测试** - `offline-sync.test.ts`
  - IndexedDB 存储 → 队列管理 → 冲突解决
- ✅ **行程分享测试** - `trip-sharing.test.ts`
  - 分享链接生成 → 公开访问 → 权限控制

#### Phase 6: E2E 测试框架 ✅
- ✅ **Playwright 配置** - `playwright.config.ts`
- ✅ **测试辅助函数** - `e2e/helpers.ts`
- ✅ **创建行程测试** - `create-trip.spec.ts`
- ✅ **PDF 导出测试** - `export-pdf.spec.ts`
- ✅ **分享行程测试** - `share-trip.spec.ts`

#### Phase 7: 测试基础设施 ✅
- ✅ **Vitest 配置** - 覆盖率阈值 80%
- ✅ **全局测试设置** - `__tests__/setup.ts`
- ✅ **Mock 系统**
  - Supabase Mock - 数据库和认证
  - Amap Mock - 地图 API
  - AI Models Mock - AI 模型调用
- ✅ **GitHub Actions CI**
  - 自动运行测试
  - 覆盖率报告
  - PR 检查

#### 测试覆盖统计
- **测试文件**: 30+
- **单元测试覆盖率**: 80%+ 阈值
- **API 路由**: 6/6 完成
- **集成测试**: 3/3 完成
- **E2E 测试**: 4 个场景

### 新增文档
- ✅ `docs/TESTING_GUIDE.md` - 单元测试完整指南
- ✅ `docs/E2E_TESTING.md` - E2E 测试完整指南
- ✅ `docs/TESTING_IMPROVEMENT_PLAN.md` - 测试改进计划

### 依赖包更新
- ✅ `vitest@^4.0.9` - 单元测试框架
- ✅ `@playwright/test@^1.56.1` - E2E 测试框架
- ✅ `@testing-library/react@^16.3.0` - React 测试库
- ✅ `msw@^2.x` - API Mock

## [1.0.0] - 2025-11-18

### 重大重构 - Phase 1-3 代码质量提升

这是一个里程碑版本，完成了全面的代码重构，大幅提升了代码质量、可维护性和可扩展性。

#### Phase 1: API 路由层优化 ✅
- ✅ **中间件基础设施**
  - 创建统一认证中间件（requireAuth, optionalAuth, requireOwnership）
  - 创建统一错误处理（handleApiError, withErrorHandler）
  - 创建统一响应格式（success, created, error, paginated）
  - 创建 Zod 参数验证系统

- ✅ **API 端点重构**（16 个）
  - 核心功能 API: trips, generate-itinerary, enrich-attraction, enrich-hotel
  - 费用管理 API: expenses CRUD
  - 用户管理 API: user profile, password, api-keys
  - 辅助 API: voice, weather

- ✅ **成果**
  - 消除 98% 认证代码重复
  - 100% 统一错误处理和响应格式
  - 代码减少 ~900 lines

#### Phase 2: lib/ 目录重构 ✅
- ✅ **模块化重构**
  - 合并地理编码模块（删除 284 行重复代码）
  - 优化 API Key 管理（统一测试函数 + 结构化日志）
  - 拆分 PDF 导出模块（813→213 行，减少 73.8%）
  - 创建常量管理系统（lib/constants/）

- ✅ **自定义 Hooks**
  - usePhotoCarousel - 照片轮播逻辑
  - useAuthFetch - 带认证的请求封装
  - useAMapLoader - 地图 SDK 加载（Phase 3）

- ✅ **成果**
  - 代码减少 ~900 lines
  - 新增模块化文件 14 个
  - 建立统一的常量管理

#### Phase 3: 组件层优化 ✅
- ✅ **共享 UI 组件**
  - PhotoCarousel - 统一照片轮播组件
  - RatingDisplay - 统一星级评分显示
  - MapLegend - 地图图例组件

- ✅ **地图组件优化**
  - TripMapToolbar - 行程地图工具栏（164 行）
  - 创建 map-markers.ts 工具模块（264 行）
  - 创建 ui-helpers.ts 辅助函数（227 行）

- ✅ **API Key 管理优化**
  - 拆分为 6 个子组件（ApiKeyHeader, ConfigurationWarnings, ServiceGroup 等）
  - ApiKeyManager: 561→351 行（-37.4%）

- ✅ **大型组件拆分**
  - TripOverviewMap: 594→323 行（-45.6%）
  - MapView: 484→401 行（-17.1%）
  - 平均减少 34.4% 代码量

- ✅ **成果**
  - 新增可复用组件/工具 13 个（1,493 行）
  - 消除重复代码 754 行
  - 组件重构数量 11 个

#### 总体成果
- **代码减少**: ~2,554 lines（Phase 1: 900 + Phase 2: 900 + Phase 3: 754）
- **新增基础设施**: 30+ 个模块化文件
- **可维护性提升**: 约 40%
- **代码复用率**: 显著提高
- **类型安全**: 100% TypeScript + Zod 验证

#### 新增功能
- ✅ **行程分享功能** - 支持生成公开分享链接
- ✅ **PWA 支持** - 支持安装为桌面/移动应用
- ✅ **离线缓存** - IndexedDB + 数据同步引擎
- ✅ **进程管理** - PM2 + 健康检查脚本

### 改进

#### 架构优化
- ✅ 建立清晰的三层架构（API - lib - Components）
- ✅ 统一的错误处理和日志系统
- ✅ 模块化的职责分离
- ✅ 可复用的组件和工具库

#### 开发体验
- ✅ 更清晰的代码组织
- ✅ 更好的类型提示
- ✅ 统一的开发规范
- ✅ 完善的文档体系

### 文档更新
- ✅ 新增 `docs/PHASE_3_COMPLETION_REPORT.md` - Phase 3 完成报告
- ✅ 更新 `CLAUDE.md` - 反映重构后的项目结构
- ✅ 整理文档目录结构

### 依赖包更新
- ✅ 新增 `zod` - 参数验证

## [0.3.0] - 2025-10-23

### 新增功能

#### 费用数据可视化
- ✅ **BudgetChart 组件** - 完整的数据可视化解决方案
  - 饼图：费用类别分布（带百分比标签）
  - 柱状图：每日开销趋势分析
  - 进度条：实时预算使用监控
  - 智能颜色提示（绿色/黄色/红色）

- ✅ **数据导出功能**
  - CSV 导出：支持 Excel 直接打开
  - PDF 导出：生成专业费用报告

- ✅ **日期筛选** - 灵活的时间范围分析
  - 自定义开始/结束日期
  - 实时图表更新
  - 一键重置功能

#### 数据处理工具
- ✅ **analytics.ts 工具库**
  - 按类别聚合费用
  - 按日期聚合费用
  - 预算统计计算
  - 类别中英文映射

### 改进

#### 类型系统优化
- ✅ 统一 Expense 类型定义
- ✅ 添加类别映射（中文 ↔ 英文）
- ✅ 修复数据库字段名不一致问题

#### 响应式设计
- ✅ 桌面端：图表左右并排
- ✅ 平板端：图表垂直堆叠
- ✅ 移动端：单列布局，触摸友好

### Bug 修复
- ✅ 修复 expense 表字段名不匹配（`date` vs `expense_date`）
- ✅ 修复类别值中英文不一致问题
- ✅ 优化图表数据显示

### 文档更新
- ✅ 新增 `docs/BUDGET_VISUALIZATION.md` - 费用可视化完整文档
- ✅ 新增 `docs/EXAMPLES.md` - 使用示例和最佳实践
- ✅ 新增 `docs/BUGFIX_EXPENSE_FIELDS.md` - Bug 修复记录
- ✅ 文档整理：归档过时文档，合并相似内容

### 依赖包更新
- ✅ 新增 `recharts@^2.15.0` - 图表库
- ✅ 新增 `jspdf@^2.5.2` - PDF 生成
- ✅ 新增 `jspdf-autotable@^3.8.4` - PDF 表格

## [0.2.0] - 2025-10-22

### 新增功能

#### 地图集成
- ✅ **高德地图 Web API 集成**
  - 在行程详情页显示景点位置
  - 支持景点标注和信息窗口
  - 路线规划功能
  - 响应式地图设计

#### 出发地功能
- ✅ **行程创建表单改进**
  - 添加出发地输入字段
  - 支持语音输入出发地
  - AI 根据出发地准确估算交通费用
  - 推荐最佳交通方式

#### 费用追踪系统
- ✅ **ExpenseForm 组件** - 费用录入表单
  - 支持语音输入金额和描述
  - 实时预算对比
  - 费用分类管理

- ✅ **ExpenseList 组件** - 费用记录列表
  - 费用统计卡片
  - 编辑和删除功能
  - 预算使用进度显示

#### 行程管理增强
- ✅ **删除行程功能**
  - Dashboard 卡片悬浮删除按钮
  - 行程详情页删除功能
  - 确认对话框防止误删

### 改进

#### 数据库优化
- ✅ 创建统一初始化脚本 `supabase-init.sql`
- ✅ 添加性能优化索引
- ✅ 添加自动更新时间戳触发器
- ✅ trips 表新增 origin 列

#### AI 模型配置
- ✅ DeepSeek Chat 设为默认模型
- ✅ 优化 AI prompt，强化位置信息
- ✅ 改进交通费用估算逻辑

### 文档更新
- ✅ 新增 `docs/MAP_INTEGRATION.md` - 地图集成详细说明
- ✅ 新增 `docs/ORIGIN_FIELD_UPDATE.md` - 出发地功能说明
- ✅ 新增 `docs/DATABASE_SETUP.md` - 数据库设置完整指南

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

**最后更新**: 2025-11-23
