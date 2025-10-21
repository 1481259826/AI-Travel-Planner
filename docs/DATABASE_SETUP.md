# 数据库设置指南

## 概述

本项目使用 Supabase 作为后端数据库，提供用户认证、数据存储和行级安全策略。

## SQL 文件说明

项目根目录下有以下 SQL 文件：

### 1. `supabase-init.sql` ⭐ **推荐使用**

**用途：** 完整的数据库初始化脚本

**包含内容：**
- ✅ 所有表结构（profiles, trips, expenses）
- ✅ 所有 RLS 策略
- ✅ 数据库索引
- ✅ 自动更新时间戳的触发器
- ✅ 向后兼容逻辑（支持旧版本升级）
- ✅ 自动为现有用户创建 profiles

**适用场景：**
- 新项目初始化
- 完全重建数据库
- 从零开始设置

### 2. `supabase-add-origin.sql`

**用途：** 为现有项目添加出发地功能

**包含内容：**
- 添加 `origin` 列到 `trips` 表
- 为现有数据设置默认值

**适用场景：**
- 从旧版本升级
- 只需要添加出发地字段

### 3. `supabase-schema.sql` （已弃用）

**用途：** 原始的表结构定义

**说明：** 已被 `supabase-init.sql` 替代，保留用于参考

### 4. `supabase-fix-profiles.sql` （已弃用）

**用途：** 修复 profiles 表的 RLS 策略

**说明：** 已合并到 `supabase-init.sql`，保留用于参考

## 使用指南

### 场景 1：全新项目初始化

**步骤：**

1. 登录 [Supabase Dashboard](https://supabase.com)
2. 创建新项目或选择现有项目
3. 左侧菜单点击 **SQL Editor**
4. 点击 **New Query**
5. 复制 `supabase-init.sql` 的全部内容
6. 粘贴到编辑器
7. 点击 **Run** 执行
8. 等待执行完成，查看成功消息

**预期结果：**
```
✅ 数据库初始化成功！所有表已创建。

 table_name | column_count
------------+--------------
 expenses   |           8
 profiles   |           5
 trips      |          13
```

### 场景 2：旧项目升级（添加出发地功能）

如果您的项目已经在运行，只需要添加出发地字段：

**步骤：**

1. 登录 Supabase Dashboard
2. 进入 **SQL Editor**
3. 新建查询
4. 复制 `supabase-add-origin.sql` 内容
5. 执行

**预期结果：**
```sql
ALTER TABLE
-- origin 列已添加
```

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
| origin | TEXT | 出发地 ⭐ 新增 |
| destination | TEXT | 目的地 |
| start_date | DATE | 出发日期 |
| end_date | DATE | 返回日期 |
| budget | DECIMAL | 预算 |
| travelers | INTEGER | 总人数 |
| adult_count | INTEGER | 成人数 |
| child_count | INTEGER | 儿童数 |
| preferences | TEXT[] | 旅行偏好 |
| itinerary | JSONB | 行程详情 |
| status | TEXT | 状态 |
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
- ✅ 用户可以创建自己的行程
- ✅ 用户可以更新自己的行程
- ✅ 用户可以删除自己的行程

### Expenses 表策略

- ✅ 用户可以查看自己行程的开支
- ✅ 用户可以创建自己行程的开支
- ✅ 用户可以更新自己行程的开支
- ✅ 用户可以删除自己行程的开支

## 性能优化

`supabase-init.sql` 包含以下索引优化：

```sql
-- Trips 表索引
idx_trips_user_id      -- 加速用户行程查询
idx_trips_status       -- 加速状态筛选
idx_trips_start_date   -- 加速日期排序

-- Expenses 表索引
idx_expenses_trip_id   -- 加速行程开支查询
idx_expenses_date      -- 加速日期查询
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

**A:** `supabase-init.sql` 使用 `CREATE TABLE IF NOT EXISTS`，可以安全地重复执行。如需完全重建：

```sql
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

然后重新运行 `supabase-init.sql`。

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
