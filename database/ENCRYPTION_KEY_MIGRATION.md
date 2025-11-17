# 加密密钥迁移指南

## 问题描述

当 `ENCRYPTION_KEY` 环境变量改变后，之前使用旧密钥加密的 API Keys 将无法解密，导致以下错误：

```
Decryption error: Error: Decryption resulted in empty string
```

## 影响范围

- 用户自定义的 API Keys（DeepSeek、ModelScope、高德地图、科大讯飞语音）
- 这些 Key 存储在数据库的 `api_keys` 表中，使用 AES-256 加密

## 解决方案

### 方案 1：用户重新保存 API Keys（推荐）

1. 登录应用
2. 进入"设置"页面
3. 重新输入并保存所有 API Keys
4. 新的 Keys 将使用当前的 `ENCRYPTION_KEY` 加密

### 方案 2：清理损坏的 API Keys（数据库操作）

如果用户不记得之前配置的 Keys，可以直接删除损坏的记录：

#### 通过 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 运行以下 SQL：

```sql
-- 查看特定用户的 API Keys
SELECT id, user_id, service, created_at
FROM api_keys
WHERE user_id = 'YOUR_USER_ID';

-- 删除特定用户的所有 API Keys
DELETE FROM api_keys
WHERE user_id = 'YOUR_USER_ID';

-- 或者只删除特定服务的 Key
DELETE FROM api_keys
WHERE user_id = 'YOUR_USER_ID' AND service = 'voice';
```

#### 使用提供的脚本

```bash
# 编辑 database/cleanup-corrupted-keys.sql 中的用户 ID
# 然后在 Supabase SQL Editor 中运行
```

### 方案 3：恢复旧的加密密钥（不推荐）

如果你知道之前使用的 `ENCRYPTION_KEY`，可以：

1. 临时恢复旧密钥
2. 导出所有 API Keys（解密）
3. 更换为新密钥
4. 重新加密并保存所有 Keys

**注意**：这个方案复杂且容易出错，不推荐使用。

## 预防措施

### 1. 不要随意更改 ENCRYPTION_KEY

`ENCRYPTION_KEY` 应该在初始化时设置，并保持不变。如果必须更改：

- 提前通知所有用户
- 提供迁移脚本
- 备份数据库

### 2. 密钥管理最佳实践

```bash
# 开发环境 (.env.local)
ENCRYPTION_KEY="your-development-key-at-least-32-chars"

# 生产环境（使用密钥管理服务）
# Vercel: 在项目设置中配置环境变量
# Docker: 使用 secrets 管理
# 其他: 使用 AWS Secrets Manager、Azure Key Vault 等
```

### 3. 加密密钥要求

- **长度**：至少 32 个字符（AES-256 要求）
- **复杂度**：包含大小写字母、数字、特殊字符
- **唯一性**：每个环境使用不同的密钥
- **安全性**：不要提交到版本控制系统

### 4. 生成安全的加密密钥

```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 当前错误处理

应用已经改进了错误处理：

- ✅ 解密失败时记录警告而不是错误
- ✅ 自动回退到系统默认配置
- ✅ 不会中断用户操作
- ✅ 提供清晰的日志提示

用户在使用过程中不会遇到致命错误，但建议尽快重新保存 API Keys 以获得最佳体验。

## 检查是否存在损坏的 Keys

运行以下 SQL 查询：

```sql
SELECT
  user_id,
  service,
  created_at,
  updated_at,
  LENGTH(encrypted_key) as key_length,
  is_active
FROM api_keys
ORDER BY updated_at DESC;
```

如果 `encrypted_key` 长度异常短或为 NULL，说明数据可能损坏。

## 相关文件

- `lib/encryption.ts` - 加密/解密实现
- `lib/api-keys.ts` - API Key 管理逻辑
- `app/dashboard/settings/page.tsx` - 用户设置页面
- `database/cleanup-corrupted-keys.sql` - 清理脚本
