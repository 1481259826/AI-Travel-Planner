# Database Setup

本目录包含 Supabase 数据库初始化脚本。

## 文件说明

### init.sql
完整的数据库初始化脚本（v3.1），包含：

**基础表结构：**
- `profiles` 表 - 用户配置信息
- `trips` 表 - 旅行行程数据
- `expenses` 表 - 费用追踪记录
- `api_keys` 表 - API 密钥管理

**功能特性：**
- ✅ 行级安全策略 (RLS)
- ✅ 自动更新时间戳触发器
- ✅ 行程分享功能（share_token、is_public）
- ✅ API Keys 管理（支持 base_url 和 extra_config）
- ✅ 性能优化索引
- ✅ 向后兼容（自动添加缺失字段）

### migrations/
历史迁移文件，记录数据库架构变更：
- `20250111_add_api_key_extra_fields.sql` - 添加 API Keys 表的 base_url 和 extra_config 字段

## 使用方法

### 1. 新项目初始化

在 Supabase SQL Editor 中执行：

```sql
-- 复制 init.sql 的全部内容并执行
```

或使用命令行（如果配置了 Supabase CLI）：

```bash
supabase db reset
psql $DATABASE_URL < database/init.sql
```

### 2. 已有项目升级

脚本包含向后兼容逻辑，会自动检测并添加缺失的字段：

**Trips 表：**
- `origin` - 出发地
- `start_time` / `end_time` - 出发/返回时间
- `share_token` - 分享标识
- `is_public` - 公开标识

**Profiles 表：**
- `theme` - 主题设置
- `default_model` - 默认 AI 模型
- `default_budget` - 默认预算
- `default_origin` - 默认出发地

**API Keys 表：**
- `base_url` - 自定义 API 基础 URL
- `extra_config` - 额外配置（JSON）

直接运行 `init.sql` 即可完成升级。

## 验证

执行完成后，您应该看到：

```
✅ 数据库初始化成功！
已创建的表:
  - profiles (用户配置 + 设置)
  - trips (旅行行程 + 分享功能)
  - expenses (费用追踪)
  - api_keys (API密钥管理)

已启用的功能:
  ✓ 行级安全策略 (RLS)
  ✓ 自动更新时间戳
  ✓ 行程分享功能
  ✓ 用户设置 (主题/默认值)
  ✓ API Keys 管理
  ✓ 性能优化索引
```

## 详细文档

更多数据库配置说明请查看：[DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)
