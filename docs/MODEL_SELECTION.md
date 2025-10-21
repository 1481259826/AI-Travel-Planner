# AI 模型选择功能说明

## 功能概述

本项目支持多个 AI 模型进行旅行行程生成，用户可以在创建行程时选择不同的 AI 模型。

## 支持的模型

### 1. Claude Haiku 4.5
- **提供商**: Anthropic
- **特点**: 快速且经济
- **推荐场景**: 日常使用、快速生成
- **最大 tokens**: 8000

### 2. Claude 3.5 Sonnet
- **提供商**: Anthropic
- **特点**: 平衡性能和成本
- **推荐场景**: 复杂行程规划
- **最大 tokens**: 8000

### 3. DeepSeek Chat
- **提供商**: DeepSeek
- **特点**: 中文支持优秀
- **推荐场景**: 中文旅行规划
- **最大 tokens**: 8000

## 配置说明

### 环境变量配置

在 `.env.local` 文件中配置：

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
BASE_URL=https://api.anthropic.com

# DeepSeek API（可选）
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 获取 API Key

#### Anthropic Claude
1. 访问 https://console.anthropic.com
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新密钥

#### DeepSeek
1. 访问 https://platform.deepseek.com
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新密钥

## 使用方法

1. 打开创建行程页面：http://localhost:3003/dashboard/create
2. 填写行程信息（目的地、日期、预算等）
3. 在页面底部选择想要使用的 AI 模型
4. 点击"生成旅行计划"按钮

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
   - **Anthropic**: 使用 `@anthropic-ai/sdk`
   - **DeepSeek**: 使用 `openai` SDK（OpenAI 兼容）
3. 调用相应的 AI API 生成行程
4. 解析 JSON 响应
5. 保存到 Supabase 数据库

### 添加新模型

1. 在 `types/index.ts` 中添加模型类型：
   ```typescript
   export type AIModel = 'claude-haiku-4-5' | 'your-new-model'
   ```

2. 在 `lib/models.ts` 中添加模型配置：
   ```typescript
   {
     id: 'your-new-model',
     name: '模型名称',
     provider: 'provider-name',
     description: '模型描述',
     maxTokens: 8000,
     enabled: true,
   }
   ```

3. 在 `lib/config.ts` 中添加配置：
   ```typescript
   yourProvider: {
     apiKey: process.env.YOUR_API_KEY || '',
     baseURL: process.env.YOUR_BASE_URL || '',
     model: 'your-model-name',
     maxTokens: 8000,
   }
   ```

4. 在 `app/api/generate-itinerary/route.ts` 中添加调用逻辑

## 更新日志

### 2025-10-21
- ✅ 添加模型选择功能
- ✅ 集成 DeepSeek 模型
- ✅ 修复 API 调用问题
- ✅ 修复数据库保存问题
- ✅ 创建说明文档
