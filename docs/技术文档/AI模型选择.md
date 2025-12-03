# AI 模型选择功能说明

## 功能概述

本项目支持多个 AI 模型进行旅行行程生成，用户可以在创建行程时选择不同的 AI 模型。

## 支持的模型

### 1. DeepSeek Chat
- **提供商**: DeepSeek
- **特点**: 中文支持优秀，性价比高
- **推荐场景**: 日常使用、中文旅行规划
- **最大 tokens**: 8000
- **优势**:
  - 优秀的中文理解和生成能力
  - 快速响应
  - 高性价比

### 2. DeepSeek Reasoner
- **提供商**: DeepSeek
- **特点**: 深度推理能力强
- **推荐场景**: 复杂行程规划、多约束条件优化
- **最大 tokens**: 8000
- **优势**:
  - 强大的逻辑推理能力
  - 适合复杂多日行程
  - 更好的预算和时间优化

### 3. Qwen2.5 72B Instruct (ModelScope)
- **提供商**: ModelScope（阿里巴巴）
- **特点**: 开源大模型，中文能力强
- **推荐场景**: 中文旅行规划、详细行程描述
- **最大 tokens**: 8000
- **优势**:
  - 阿里巴巴开源大模型
  - 优秀的中文理解能力
  - 免费API额度（ModelScope平台）

## 配置说明

### 环境变量配置

在 `.env.local` 文件中配置：

```env
# DeepSeek API（必需）
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com

# ModelScope API（可选）
MODELSCOPE_API_KEY=ms-xxxxx
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1/
```

### 获取 API Key

#### DeepSeek (必需)
1. 访问 https://platform.deepseek.com
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新密钥
5. 复制密钥到 `.env.local` 的 `DEEPSEEK_API_KEY`

**费用说明**：
- 首次注册送免费额度
- DeepSeek Chat: 约 ¥0.001/千tokens
- DeepSeek Reasoner: 约 ¥0.014/千tokens

#### ModelScope (可选)
1. 访问 https://modelscope.cn
2. 注册/登录账号（支持支付宝、手机号）
3. 进入「体验平台」→「API 推理服务」
4. 创建并获取 API Key
5. 复制密钥到 `.env.local` 的 `MODELSCOPE_API_KEY`

**费用说明**：
- 提供免费API额度
- Qwen系列模型免费或低成本
- 适合开发测试使用

## 使用方法

### 方法1：创建行程时选择
1. 打开创建行程页面：http://localhost:3008/dashboard/create
2. 填写行程信息（出发地、目的地、日期、预算等）
3. 在页面底部选择想要使用的 AI 模型
4. 点击"生成旅行计划"按钮

### 方法2：设置默认模型
1. 进入用户设置页面：http://localhost:3008/dashboard/settings
2. 在「偏好设置」中选择默认 AI 模型
3. 保存设置
4. 之后创建行程时会自动使用默认模型

## 模型选择建议

### 日常使用场景
**推荐**: DeepSeek Chat
- 快速响应
- 中文表达自然
- 费用经济

### 复杂行程规划
**推荐**: DeepSeek Reasoner
- 多约束条件优化
- 更好的时间和预算分配
- 适合长途多日行程

### 预算有限场景
**推荐**: Qwen2.5 72B (ModelScope)
- 免费API额度
- 中文能力强
- 适合开发测试

## 常见问题

### Q: 为什么提示 "Internal server error"？

**A**: 可能的原因：
1. API Key 未配置或无效
2. API 服务不可用
3. 网络连接问题

**解决方案**：
- 检查 `.env.local` 中的 API Key 是否正确
- 确认选择的模型对应的 API Key 已配置
- 查看服务器日志获取详细错误信息

### Q: 如何查看详细的错误日志？

**A**: 在终端中查看 Next.js 开发服务器的输出，错误信息会显示在 stderr 中。

### Q: 数据库保存失败怎么办？

**A**: "Failed to save trip" 错误通常是由于：
1. Supabase 数据库未正确配置
2. RLS（行级安全）策略问题
3. 用户未登录或认证失败

**解决方案**：
- 确保已在 Supabase 中运行 `supabase-schema.sql`
- 确认用户已登录
- 检查 Supabase 项目设置中的 RLS 策略

## 技术实现

### 文件结构

```
├── types/index.ts              # AI 模型类型定义
├── lib/
│   ├── config.ts              # 配置管理（包含模型配置）
│   └── models.ts              # 可用模型列表
├── components/
│   └── ModelSelector.tsx      # 模型选择器 UI 组件
└── app/api/
    └── generate-itinerary/
        └── route.ts           # API 路由（支持多模型）
```

### API 调用流程

1. 前端发送包含 `model` 字段的表单数据
2. API 路由根据模型选择对应的客户端：
   - **DeepSeek**: 使用 `openai` SDK（OpenAI 兼容接口）
   - **ModelScope**: 使用 `openai` SDK（OpenAI 兼容接口）
3. 优先使用用户自定义的 API Key（如果已配置）
4. 调用相应的 AI API 生成行程
5. 解析 JSON 响应
6. 保存到 Supabase 数据库

### 添加新模型

如果要添加新的 AI 模型支持：

1. **添加类型定义** (`types/index.ts`)：
   ```typescript
   export type AIModel =
     | 'deepseek-chat'
     | 'deepseek-reasoner'
     | 'Qwen/Qwen2.5-72B-Instruct'
     | 'your-new-model'  // 新增
   ```

2. **添加模型配置** (`lib/models.ts`)：
   ```typescript
   {
     id: 'your-new-model',
     name: '模型显示名称',
     provider: 'provider-name',
     description: '模型特点和适用场景',
     maxTokens: 8000,
     enabled: true,
   }
   ```

3. **添加环境变量配置** (`lib/config.ts`)：
   ```typescript
   yourProvider: {
     apiKey: process.env.YOUR_API_KEY || '',
     baseURL: process.env.YOUR_BASE_URL || 'https://api.example.com',
     model: 'your-model-name',
     maxTokens: 8000,
   }
   ```

4. **更新API路由** (`app/api/generate-itinerary/route.ts`)：
   - 添加新的客户端初始化逻辑
   - 添加模型选择分支
   - 实现API调用逻辑

## 更新日志

### 2025-01-07
- ✅ 移除 Anthropic Claude 模型依赖
- ✅ 添加 DeepSeek Reasoner 推理模型
- ✅ 集成 ModelScope (Qwen2.5 72B) 模型
- ✅ 优化模型选择界面
- ✅ 更新文档说明

### 2025-10-21
- ✅ 添加模型选择功能
- ✅ 集成 DeepSeek 模型
- ✅ 修复 API 调用问题
- ✅ 修复数据库保存问题
- ✅ 创建说明文档
