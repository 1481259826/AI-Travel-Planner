# Bug 修复：Expense 字段名不一致问题

## 问题描述

在实现费用数据可视化功能时，发现代码中使用的字段名与数据库 schema 不一致，导致以下错误：

```
Error fetching expenses: {}
```

## 根本原因

### 1. 字段名不一致

**数据库 Schema** (`supabase-init.sql:127`):
```sql
CREATE TABLE public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,  -- ✅ 字段名是 'date'
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**代码中使用的字段名**:
```typescript
// ❌ 错误：使用了 expense_date
expense.expense_date
```

### 2. 类别值的中英文不一致

**数据库 Schema**:
```sql
category TEXT NOT NULL CHECK (category IN (
  'accommodation',     -- 住宿
  'transportation',    -- 交通
  'food',             -- 餐饮
  'attractions',      -- 景点
  'shopping',         -- 购物
  'other'             -- 其他
))
```

**代码期望值**:
```typescript
// ❌ 错误：期望中文值
'交通', '住宿', '餐饮', '景点', '购物', '其他'
```

## 修复方案

### 1. 更新类型定义 (`types/expense.ts`)

添加了完整的类型定义和中英文映射：

```typescript
export interface Expense {
  id: string;
  trip_id: string;
  category: string; // 数据库存储英文
  amount: number;
  description: string | null;
  date: string; // ✅ 修正：使用 'date' 而不是 'expense_date'
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
}

// 类别映射：中文 -> 英文
export const categoryToDB: Record<ExpenseCategoryDisplay, ExpenseCategoryDB> = {
  '交通': 'transportation',
  '住宿': 'accommodation',
  '餐饮': 'food',
  '景点': 'attractions',
  '购物': 'shopping',
  '其他': 'other',
};

// 类别映射：英文 -> 中文
export const categoryToDisplay: Record<ExpenseCategoryDB, ExpenseCategoryDisplay> = {
  'transportation': '交通',
  'accommodation': '住宿',
  'food': '餐饮',
  'attractions': '景点',
  'shopping': '购物',
  'other': '其他',
};
```

### 2. 修复页面查询 (`app/dashboard/trips/[id]/page.tsx`)

**修复前**:
```typescript
.order('expense_date', { ascending: false })  // ❌ 错误字段名
```

**修复后**:
```typescript
.order('date', { ascending: false })  // ✅ 正确字段名
```

### 3. 修复数据处理函数 (`lib/analytics.ts`)

#### aggregateByCategory - 添加类别转换

```typescript
// 将数据库中的英文类别转换为中文显示
const displayCategory = categoryToDisplay[expense.category as ExpenseCategoryDB] || '其他';
```

#### aggregateByDate - 修复字段名

```typescript
// 修复前
const date = new Date(expense.expense_date).toLocaleDateString('zh-CN');

// 修复后
const date = new Date(expense.date).toLocaleDateString('zh-CN');
```

#### exportToCSV - 添加类别转换

```typescript
const rows = expenses.map(expense => [
  new Date(expense.date).toLocaleDateString('zh-CN'),
  categoryToDisplay[expense.category as ExpenseCategoryDB] || expense.category,
  expense.description || '',
  expense.amount.toFixed(2),
]);
```

#### exportToPDF - 添加类别转换

```typescript
body: expenses.map(expense => [
  new Date(expense.date).toLocaleDateString('zh-CN'),
  categoryToDisplay[expense.category as ExpenseCategoryDB] || expense.category,
  expense.description || '',
  expense.amount.toFixed(2),
])
```

## 修复影响的文件

1. ✅ `types/expense.ts` - 添加完整类型定义和映射
2. ✅ `app/dashboard/trips/[id]/page.tsx` - 修复查询字段名
3. ✅ `lib/analytics.ts` - 修复所有函数中的字段名和类别转换

## 测试结果

- ✅ 编译成功，无错误
- ✅ 费用数据可以正常加载
- ✅ 图表能正确显示中文类别
- ✅ 导出功能正常工作

## 预防措施

### 1. 使用统一的类型定义

所有涉及 Expense 的代码都应该导入并使用 `types/expense.ts` 中的类型定义。

### 2. 数据库字段命名规范

建议在未来的开发中：
- 统一使用数据库 schema 中的字段名
- 在代码注释中明确标注数据库字段名
- 使用 TypeScript 类型检查避免字段名错误

### 3. 中英文映射

对于需要用户界面显示的字段值：
- 数据库存储标准化的英文值
- 使用映射函数转换为用户友好的中文显示
- 集中管理映射关系，避免重复定义

## 相关文档

- [数据库设置指南](./DATABASE_SETUP.md)
- [费用数据可视化文档](./BUDGET_VISUALIZATION.md)
- [Supabase 初始化脚本](../supabase-init.sql)
