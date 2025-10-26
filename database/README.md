# Database Setup

本目录包含 Supabase 数据库初始化脚本。

## 文件说明

### init.sql
完整的数据库初始化脚本，包含：

**基础表结构：**
- `profiles` 表 - 用户配置信息
- `trips` 表 - 旅行行程数据
- `expenses` 表 - 费用追踪记录

**功能特性：**
- ✅ 行级安全策略 (RLS)
- ✅ 自动更新时间戳触发器
- ✅ 行程分享功能（share_token、is_public）
- ✅ 性能优化索引
- ✅ 向后兼容（自动添加缺失字段）

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
- `origin` - 出发地
- `share_token` - 分享标识
- `is_public` - 公开标识

直接运行 `init.sql` 即可完成升级。

## 验证

执行完成后，您应该看到：

```
✅ 数据库初始化成功！
已创建的表:
  - profiles (用户配置)
  - trips (旅行行程 + 分享功能)
  - expenses (费用追踪)

已启用的功能:
  ✓ 行级安全策略 (RLS)
  ✓ 自动更新时间戳
  ✓ 行程分享功能
  ✓ 性能优化索引
```

## 详细文档

更多数据库配置说明请查看：[DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)
