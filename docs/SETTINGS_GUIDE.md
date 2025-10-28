# 设置功能使用指南

## 📋 目录

- [功能概述](#功能概述)
- [数据库设置](#数据库设置)
- [环境变量配置](#环境变量配置)
- [功能详解](#功能详解)
  - [账户信息](#1-账户信息)
  - [安全设置](#2-安全设置)
  - [偏好设置](#3-偏好设置)
  - [API Keys 管理](#4-api-keys-管理)
- [技术实现](#技术实现)
- [常见问题](#常见问题)

---

## 功能概述

设置页面提供了完整的用户配置管理功能，包括：

- ✅ **账户信息编辑** - 修改用户名、头像
- ✅ **密码修改** - 带强度验证的安全密码更换
- ✅ **主题切换** - 浅色/深色/跟随系统
- ✅ **默认偏好** - 保存常用的 AI 模型、预算、出发地
- ✅ **API Keys 管理** - 使用自己的 API Keys 替代系统默认配置

---

## 数据库设置

### 1. 执行数据库迁移

在 Supabase SQL Editor 中执行以下迁移脚本：

```bash
database/migrations/add-settings-support.sql
```

### 2. 迁移内容

脚本会执行以下操作：

#### 扩展 `profiles` 表
```sql
ALTER TABLE public.profiles
  ADD COLUMN theme TEXT DEFAULT 'system',
  ADD COLUMN default_model TEXT,
  ADD COLUMN default_budget NUMERIC,
  ADD COLUMN default_origin TEXT;
```

#### 创建 `api_keys` 表
```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT CHECK (service IN ('anthropic', 'deepseek', 'map')),
  key_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RLS (Row Level Security) 策略
- 用户只能访问自己的 API Keys
- 自动更新 `updated_at` 时间戳
- 性能优化索引

---

## 环境变量配置

在 `.env.local` 中添加加密密钥：

```bash
# ============================================
# 数据加密密钥（必需 - 用于 API Key 加密存储）
# ============================================
ENCRYPTION_KEY=your_32_char_or_longer_encryption_key_here
```

### 生成加密密钥

使用 Node.js 生成安全的随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ 重要提示：**
- 密钥至少 32 个字符
- 生产环境务必使用强随机密钥
- 不要将密钥提交到版本控制
- 密钥丢失后无法解密已存储的 API Keys

---

## 功能详解

### 1. 账户信息

**位置：** 设置 > 账户信息

#### 功能
- 📸 **头像设置** - 支持 URL 地址，实时预览
- 👤 **用户名** - 自定义显示名称
- 📧 **邮箱地址** - 只读，显示当前登录邮箱

#### 使用方法
1. 在对应输入框修改信息
2. 点击「保存更改」按钮
3. 系统显示保存成功提示
4. 点击「重置」可恢复到保存前的状态

#### 技术实现
- **API:** `GET/PUT /api/user/profile`
- **组件:** `ProfileForm.tsx`
- **数据表:** `profiles` (Supabase)

---

### 2. 安全设置

**位置：** 设置 > 安全

#### 功能
- 🔒 **密码修改** - 安全的密码更换流程
- 💪 **强度指示器** - 实时显示密码强度
- ✅ **要求验证** - 自动检查是否满足所有要求

#### 密码要求
- ✓ 至少 8 个字符
- ✓ 包含大写字母 (A-Z)
- ✓ 包含小写字母 (a-z)
- ✓ 包含数字 (0-9)
- ○ 包含特殊字符（可选，提升强度）

#### 使用方法
1. 输入当前密码
2. 输入新密码（查看强度指示器）
3. 确认新密码
4. 点击「修改密码」
5. **密码修改成功后会自动跳转到登录页，需要使用新密码重新登录**

#### 技术实现
- **API:** `POST /api/user/password`
- **组件:** `PasswordChangeForm.tsx`
- **工具函数:** `lib/utils/password.ts`
- **认证:** Supabase Auth API

#### 安全特性
- 使用 Supabase Auth 的安全密码更新 API
- 不在客户端存储密码
- 修改后自动登出，防止会话劫持

---

### 3. 偏好设置

**位置：** 设置 > 偏好设置

#### 功能

##### 🎨 主题设置
- **浅色模式** - 明亮的界面主题
- **深色模式** - 护眼的暗色主题
- **跟随系统** - 自动适配系统主题设置

主题设置会：
- 实时应用到整个应用
- 保存到数据库（下次登录保持）
- 监听系统主题变化（跟随系统模式）

##### 🤖 默认 AI 模型
选择创建行程时的默认模型：
- Claude 3.5 Haiku
- DeepSeek Chat
- DeepSeek Reasoner

##### 💰 默认预算
设置常用的旅行预算，创建行程时自动填充

##### 📍 常用出发地
设置常用出发地点，创建行程时自动填充

#### 使用方法
1. 选择主题（立即生效）
2. 配置默认值
3. 点击「保存更改」
4. 下次创建行程时会自动应用这些默认值

#### 技术实现
- **API:** `GET/PUT /api/user/profile`
- **组件:** `PreferencesForm.tsx`
- **状态管理:** Zustand (`lib/stores/theme-store.ts`)
- **主题系统:** Tailwind CSS (class-based dark mode)

#### 主题系统工作原理
```typescript
// 1. 初始化时检测系统主题
initializeTheme()

// 2. 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)')

// 3. 更新 HTML class
document.documentElement.classList.add('dark')

// 4. 保存到数据库
saveThemeToProfile(theme)
```

---

### 4. API Keys 管理

**位置：** 设置 > API Keys

#### 功能概述
添加您自己的 API Keys，系统生成行程时将**优先使用您的 Key**，而不是系统默认配置。

#### 支持的服务
- 🤖 **Anthropic Claude** - Claude AI 模型
- 🧠 **DeepSeek** - DeepSeek Chat 和 Reasoner
- 🗺️ **高德地图** - 地图显示和路线规划

#### 功能特性
- ✅ 多 Key 管理 - 每个服务可添加多个备用 Key
- ✅ 激活/停用 - 灵活控制使用哪个 Key
- ✅ 测试功能 - 一键验证 Key 是否有效
- ✅ AES-256 加密 - 安全存储，只显示前缀
- ✅ 使用记录 - 显示最后使用时间

#### 使用方法

##### 添加 API Key
1. 点击「添加 Key」按钮
2. 选择服务类型（Anthropic / DeepSeek / 高德地图）
3. 输入 Key 名称（如"我的主要 Key"）
4. 粘贴 API Key
5. 点击「添加 API Key」

**⚠️ 重要提示：**
- Key 添加后使用 AES-256 加密存储
- 无法再次查看完整 Key
- 只显示前 8 个字符（如 `sk-ant-***`）

##### 测试 API Key
1. 找到要测试的 Key
2. 点击「测试」按钮（试管图标）
3. 等待测试结果
4. 系统会显示「✅ API Key 有效」或错误信息

##### 激活/停用 Key
- 点击「勾」图标 - 激活 Key
- 点击「×」图标 - 停用 Key
- 同一服务可以有多个 Key，但只有激活的会被使用

##### 删除 Key
1. 点击「垃圾桶」图标
2. 确认删除操作
3. Key 将被永久删除

#### 获取 API Keys

##### Anthropic Claude
1. 访问 https://console.anthropic.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 Key（格式：`sk-ant-api03-...`）

##### DeepSeek
1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 管理
4. 创建新的 API Key
5. 复制 Key（格式：`sk-...`）

##### 高德地图
1. 访问 https://console.amap.com/
2. 注册/登录账号
3. 进入应用管理
4. 创建新应用或选择现有应用
5. 获取 **Web 服务 API Key**（不是 Web 端 Key）

#### 工作原理

##### 加密存储
```typescript
// 使用 AES-256 加密
const encryptedKey = encrypt(apiKey)

// 只存储前缀用于显示
const keyPrefix = getKeyPrefix(apiKey, 8) // "sk-ant-***"

// 存储到数据库
await supabase.from('api_keys').insert({
  encrypted_key: encryptedKey,
  key_prefix: keyPrefix,
  // ...
})
```

##### 行程生成时使用
```typescript
// 检查用户是否有自己的 Key
const userKey = await getUserApiKey(userId, 'anthropic')

// 优先使用用户 Key
const client = userKey
  ? new Anthropic({ apiKey: userKey })
  : anthropic // 回退到系统默认
```

##### Key 测试流程
```typescript
// Anthropic
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': apiKey }
})
return response.ok // 200 = 有效，401/403 = 无效

// DeepSeek
const response = await fetch('https://api.deepseek.com/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
return response.ok

// 高德地图
const response = await fetch(`https://restapi.amap.com/v3/ip?key=${apiKey}`)
const data = await response.json()
return data.status === '1'
```

#### 技术实现
- **API Routes:**
  - `GET/POST /api/user/api-keys` - 列表和创建
  - `PUT/DELETE /api/user/api-keys/[id]` - 更新和删除
  - `POST /api/user/api-keys/test` - 测试有效性
- **组件:**
  - `ApiKeyManager.tsx` - 主管理界面
  - `AddApiKeyModal.tsx` - 添加 Key 的模态框
- **工具函数:** `lib/api-keys.ts`
- **加密:** `lib/encryption.ts` (crypto-js)

#### 安全特性
- AES-256 对称加密
- 环境变量存储加密密钥
- RLS 策略（用户只能访问自己的 Key）
- 不在客户端显示完整 Key
- 使用 HTTPS 传输

---

## 技术实现

### 架构设计

```
┌─────────────────────────────────────────┐
│         Settings Page (page.tsx)        │
│  Tab Navigation: 账户|安全|偏好|API Keys  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
┌───────▼──────┐ ┌──▼──────┐ ┌─▼─────┐ ┌──▼──────────┐
│ProfileForm   │ │Password │ │Prefs  │ │ApiKeyManager│
│              │ │ChangeForm│ │Form   │ │             │
└───────┬──────┘ └──┬──────┘ └─┬─────┘ └──┬──────────┘
        │           │           │          │
        │           │           │          │ ┌──────────┐
        │           │           │          └►│AddKeyModal│
        │           │           │            └──────────┘
        │           │           │
        └───────────┴───────────┴────────────┐
                                              │
                    ┌─────────────────────────▼─────┐
                    │       API Routes              │
                    ├───────────────────────────────┤
                    │ /api/user/profile (GET/PUT)   │
                    │ /api/user/password (POST)     │
                    │ /api/user/api-keys (CRUD)     │
                    │ /api/user/api-keys/test       │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       Supabase Database       │
                    ├───────────────────────────────┤
                    │ profiles (用户配置)            │
                    │ api_keys (加密的 Keys)        │
                    └───────────────────────────────┘
```

### 核心技术栈

- **前端框架:** Next.js 15 (App Router)
- **UI 组件:** React + Tailwind CSS
- **状态管理:** Zustand (主题状态)
- **加密:** crypto-js (AES-256)
- **认证:** Supabase Auth
- **数据库:** Supabase PostgreSQL
- **TypeScript:** 完整类型安全

### 文件结构

```
ai-travel-planner/
├── app/
│   ├── api/
│   │   └── user/
│   │       ├── profile/route.ts          # 用户配置 API
│   │       ├── password/route.ts         # 密码修改 API
│   │       └── api-keys/
│   │           ├── route.ts              # Keys CRUD
│   │           ├── [id]/route.ts         # 单个 Key 操作
│   │           └── test/route.ts         # Key 测试
│   ├── dashboard/
│   │   └── settings/
│   │       └── page.tsx                  # 设置页面主界面
│   └── providers.tsx                     # 全局 Provider（主题）
│
├── components/
│   └── settings/
│       ├── ProfileForm.tsx               # 账户信息表单
│       ├── PasswordChangeForm.tsx        # 密码修改表单
│       ├── PreferencesForm.tsx           # 偏好设置表单
│       ├── ApiKeyManager.tsx             # API Keys 管理
│       └── AddApiKeyModal.tsx            # 添加 Key 模态框
│
├── lib/
│   ├── stores/
│   │   └── theme-store.ts                # 主题状态管理
│   ├── utils/
│   │   └── password.ts                   # 密码验证工具
│   ├── api-keys.ts                       # API Keys 工具函数
│   └── encryption.ts                     # 加密/解密函数
│
├── types/
│   └── index.ts                          # TypeScript 类型定义
│
└── database/
    └── migrations/
        └── add-settings-support.sql      # 数据库迁移脚本
```

---

## 常见问题

### Q1: 数据库迁移失败怎么办？

**A:** 检查以下几点：
1. 确保 `profiles` 表已存在
2. 确保有足够的数据库权限
3. 分段执行 SQL 脚本，逐步排查错误
4. 检查 Supabase 日志

### Q2: 密码修改后无法登录？

**A:**
1. 确认使用的是**新密码**而不是旧密码
2. 检查是否收到 Supabase 发送的密码修改确认邮件
3. 尝试使用「忘记密码」功能重置

### Q3: API Key 测试失败？

**A:** 可能的原因：
1. **Key 格式错误** - 检查是否完整复制
2. **Key 无效或过期** - 在对应平台检查 Key 状态
3. **网络问题** - 检查是否能访问对应的 API 服务
4. **权限不足** - 确保 Key 有足够的 API 调用权限
5. **服务类型错误** - 高德地图需要 Web 服务 Key，不是 Web 端 Key

### Q4: 主题切换不生效？

**A:**
1. 检查浏览器是否支持 `prefers-color-scheme`
2. 清除浏览器缓存和 localStorage
3. 检查是否在「跟随系统」模式下修改了系统主题
4. 刷新页面

### Q5: 添加的 API Key 没有被使用？

**A:** 检查：
1. Key 是否已**激活**（绿色标签）
2. Key 是否测试通过（点击测试按钮）
3. 生成行程时选择的模型是否匹配 Key 服务类型
4. 检查服务器日志是否有错误

### Q6: 忘记了 ENCRYPTION_KEY 怎么办？

**A:**
- ⚠️ **无法恢复** - AES-256 加密无法在没有密钥的情况下解密
- 需要：
  1. 生成新的 `ENCRYPTION_KEY`
  2. 删除所有现有的 API Keys（无法解密）
  3. 用户重新添加 API Keys

### Q7: 可以在多个设备使用相同的设置吗？

**A:**
- ✅ **是的** - 所有设置都存储在云端数据库
- 在任何设备登录后，设置会自动同步
- 包括：主题、默认偏好、API Keys

### Q8: API Keys 存储安全吗？

**A:**
- ✅ **AES-256 加密** - 军事级加密标准
- ✅ **环境变量存储密钥** - 不在代码中硬编码
- ✅ **RLS 策略** - 数据库级别的访问控制
- ✅ **HTTPS 传输** - 网络传输加密
- ✅ **不显示完整 Key** - UI 只显示前缀

### Q9: 如何更换系统默认的 API Keys？

**A:**
- 系统默认 Keys 在 `.env.local` 中配置
- 用户添加的 Keys 会**自动覆盖**系统默认值
- 如果没有用户 Key，自动回退到系统默认

### Q10: 偏好设置的默认值在哪里生效？

**A:**
- 创建新行程时（`/dashboard/create`）
- 系统会自动读取用户的默认偏好
- 自动填充：AI 模型、预算、出发地
- 用户仍可以手动修改

---

## 更新日志

### v1.0.0 (2025-01-28)

#### ✨ 新功能
- 完整的设置页面系统
- 账户信息编辑
- 密码修改（带强度验证）
- 主题切换（浅色/深色/跟随系统）
- 默认偏好设置
- API Keys 管理（AES-256 加密）
- 行程生成优先使用用户 API Keys

#### 🎨 UI/UX
- 响应式设计（移动端和桌面端）
- 深色模式完整支持
- 实时反馈和加载状态
- 确认对话框（删除操作）
- 密码强度可视化指示器

#### 🔒 安全性
- AES-256 加密存储 API Keys
- Row Level Security (RLS) 策略
- 密码强度验证
- Supabase Auth 集成

#### 📚 文档
- 完整的使用指南
- 数据库迁移脚本
- API 文档
- 常见问题解答

---

## 支持与反馈

如果您遇到问题或有改进建议，请：
1. 查看本文档的「常见问题」部分
2. 检查 GitHub Issues
3. 提交新的 Issue 或 Pull Request

---

**文档版本:** v1.0.0
**最后更新:** 2025-01-28
**维护者:** AI Travel Planner Team
