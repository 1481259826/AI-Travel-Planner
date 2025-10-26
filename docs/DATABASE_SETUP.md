# 数据库设置指南

## 概述

本项目使用 Supabase 作为后端数据库，提供用户认证、数据存储和行级安全策略。

## SQL 文件说明

项目 `database/` 目录下的初始化脚本：

### `database/init.sql` ⭐ **完整初始化脚本**

**用途：** 一站式数据库初始化，包含所有功能

**包含内容：**
- ✅ 所有表结构（profiles, trips, expenses）
- ✅ 行程分享功能（share_token, is_public）
- ✅ 费用追踪功能
- ✅ 完整的 RLS 策略（包括公开访问）
- ✅ 性能优化索引
- ✅ 自动更新时间戳的触发器
- ✅ 分享 token 生成函数
- ✅ 向后兼容逻辑（自动添加缺失字段）
- ✅ 自动为现有用户创建 profiles

**适用场景：**
- ✨ 新项目初始化（推荐）
- 🔄 旧项目升级
- 🔨 完全重建数据库
- 📦 所有功能一键部署

## 使用指南

### 场景 1：全新项目初始化

**步骤：**

1. 登录 [Supabase Dashboard](https://supabase.com)
2. 创建新项目或选择现有项目
3. 左侧菜单点击 **SQL Editor**
4. 点击 **New Query**
5. 复制 `database/init.sql` 的全部内容
6. 粘贴到编辑器
7. 点击 **Run** 执行
8. 等待执行完成，查看成功消息

**预期结果：**
```
========================================
✅ 数据库初始化成功！
========================================
已创建的表:
  - profiles (用户配置)
  - trips (旅行行程 + 分享功能)
  - expenses (费用追踪)

已启用的功能:
  ✓ 行级安全策略 (RLS)
  ✓ 自动更新时间戳
  ✓ 行程分享功能
  ✓ 性能优化索引
========================================

 表名      | 字段数
-----------+-------
 expenses  |     8
 profiles  |     6
 trips     |    16
```

### 场景 2：旧项目升级

如果您的项目已经在运行，想要添加新功能（分享、出发地等）：

**步骤：**

1. 登录 Supabase Dashboard
2. 进入 **SQL Editor**
3. 新建查询
4. 复制 `database/init.sql` 全部内容
5. 执行

**说明：** 脚本包含向后兼容逻辑，会自动检测并添加以下缺失字段：
- `origin` - 出发地
- `share_token` - 分享标识
- `is_public` - 公开标识

已存在的数据不会受影响，只会添加新字段和策略。

### 场景 3：验证数据库状态

**检查所有表是否存在：**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**检查 trips 表结构：**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
ORDER BY ordinal_position;
```

**检查 RLS 策略：**

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

## 数据库结构

### Profiles 表

存储用户配置信息（扩展 auth.users）

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键，关联 auth.users |
| email | TEXT | 用户邮箱 |
| name | TEXT | 用户昵称 |
| avatar_url | TEXT | 头像 URL |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### Trips 表

存储旅行行程

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID（外键） |
| origin | TEXT | 出发地 |
| destination | TEXT | 目的地 |
| start_date | DATE | 出发日期 |
| end_date | DATE | 返回日期 |
| budget | DECIMAL | 预算 |
| travelers | INTEGER | 总人数 |
| adult_count | INTEGER | 成人数 |
| child_count | INTEGER | 儿童数 |
| preferences | TEXT[] | 旅行偏好 |
| itinerary | JSONB | 行程详情 |
| status | TEXT | 状态（draft/planned/ongoing/completed） |
| share_token | TEXT | 分享标识（唯一） ⭐ |
| is_public | BOOLEAN | 是否公开分享 ⭐ |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### Expenses 表

存储开支记录（计划功能）

| 列名 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| trip_id | UUID | 行程 ID（外键） |
| category | TEXT | 分类 |
| amount | DECIMAL | 金额 |
| description | TEXT | 描述 |
| date | DATE | 日期 |
| receipt_url | TEXT | 收据 URL |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 安全策略（RLS）

所有表都启用了行级安全策略（Row Level Security），确保用户只能访问自己的数据。

### Profiles 表策略

- ✅ 用户可以查看自己的 profile
- ✅ 用户可以更新自己的 profile
- ✅ 用户可以插入自己的 profile

### Trips 表策略

- ✅ 用户可以查看自己的行程
- ✅ **任何人都可以查看公开的行程**（通过 share_token）⭐
- ✅ 用户可以创建自己的行程
- ✅ 用户可以更新自己的行程
- ✅ 用户可以删除自己的行程

### Expenses 表策略

- ✅ 用户可以查看自己行程的开支
- ✅ **任何人都可以查看公开行程的开支** ⭐
- ✅ 用户可以创建自己行程的开支
- ✅ 用户可以更新自己行程的开支
- ✅ 用户可以删除自己行程的开支

## 性能优化

`database/init.sql` 包含以下索引优化：

```sql
-- Profiles 表索引
idx_profiles_email        -- 加速邮箱查询

-- Trips 表索引
idx_trips_user_id         -- 加速用户行程查询
idx_trips_status          -- 加速状态筛选
idx_trips_start_date      -- 加速日期排序
idx_trips_share_token     -- 加速分享链接查询 ⭐
idx_trips_is_public       -- 加速公开行程查询 ⭐

-- Expenses 表索引
idx_expenses_trip_id      -- 加速行程开支查询
idx_expenses_date         -- 加速日期查询
idx_expenses_category     -- 加速分类查询
```

## 自动触发器

自动更新 `updated_at` 时间戳：

- 当 profiles 记录更新时
- 当 trips 记录更新时
- 当 expenses 记录更新时

## 常见问题

### Q1: 执行 SQL 时提示权限错误？

**A:** 确保您使用的是项目所有者账号登录 Supabase Dashboard。

### Q2: 表已存在，如何重新初始化？

**A:** `database/init.sql` 使用 `CREATE TABLE IF NOT EXISTS`，可以安全地重复执行。如需完全重建：

```sql
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

然后重新运行 `database/init.sql`。

### Q3: 如何检查 origin 列是否存在？

**A:** 运行以下查询：

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'trips' AND column_name = 'origin';
```

如果返回结果，说明列已存在。

### Q4: 旧数据的 origin 字段是什么？

**A:** 对于升级前创建的行程，`origin` 字段为 `NULL`。不影响查看和使用，但无法利用出发地计算准确的交通费用。

### Q5: 如何备份数据？

**A:** 在 Supabase Dashboard：
1. 进入 Database → Backups
2. 点击 "Create backup"
3. 等待备份完成

或使用 SQL 导出：

```sql
COPY (SELECT * FROM public.trips) TO '/tmp/trips_backup.csv' CSV HEADER;
```

## 版本历史

### v2.0 (2025-10-26) - 当前版本
- ✅ 合并所有 SQL 文件为单一 `database/init.sql`
- ✅ 添加行程分享功能（share_token, is_public）
- ✅ 添加公开访问 RLS 策略
- ✅ 添加分享 token 生成函数
- ✅ 优化索引策略
- ✅ 完善向后兼容逻辑

### v1.1 (2025-10-21)
- ✅ 添加 `origin` 字段到 trips 表
- ✅ 创建统一初始化脚本 `supabase-init.sql`
- ✅ 添加数据库索引
- ✅ 添加自动更新触发器
- ✅ 改进向后兼容性

### v1.0 (初始版本)
- ✅ 创建基础表结构
- ✅ 配置 RLS 策略
- ✅ 基础功能实现

## 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL RLS 文档](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [项目 README](../README.md)
