# 出发地字段更新说明

## 概述

为了更准确地估算交通费用，我们在行程创建表单中添加了"出发地"字段。AI 现在可以根据出发地和目的地之间的实际距离，生成更准确的交通费用预估。

## 更新内容

### 1. 前端表单更新

**文件：** `app/dashboard/create/page.tsx`

- ✅ 添加了"出发地"输入框
- ✅ 支持语音输入出发地
- ✅ 出发地和目的地并排显示（桌面端）
- ✅ 响应式布局支持移动端

**示例：**
```tsx
出发地：上海
目的地：北京
```

### 2. 类型定义更新

**文件：** `types/index.ts`

```typescript
export interface TripFormData {
  origin: string        // 新增：出发地
  destination: string
  // ... 其他字段
}
```

### 3. 数据库更新

**主 Schema：** `supabase-schema.sql`
**迁移脚本：** `supabase-add-origin.sql`

添加了 `origin` 列到 `trips` 表：

```sql
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS origin TEXT;
```

**执行步骤：**

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 执行 `supabase-add-origin.sql` 脚本
4. 验证列是否成功添加

### 4. AI Prompt 优化

**文件：** `app/api/generate-itinerary/route.ts`

AI prompt 现在包含：

```
出发地：${formData.origin || '未指定'}
目的地：${formData.destination}
```

并强调交通费用估算：

```
4. **费用估算要尽量准确，特别是交通费用：**
   - 如果提供了出发地，请根据出发地到目的地的实际距离计算往返交通费用
   - 飞机、高铁、汽车等交通方式要基于真实价格估算
   - 目的地内部的交通费用也要准确计算
```

## 功能改进

### 交通费用估算更准确

**之前：**
- 只有目的地信息
- 交通费用基于估算
- 可能不够准确

**现在：**
- 有出发地和目的地
- AI 根据实际距离计算
- 可以选择合适的交通方式（飞机/高铁/汽车）
- 费用更符合真实情况

### 示例对比

**场景：从上海到北京旅行**

**之前（没有出发地）：**
```json
{
  "transportation": {
    "to_destination": {
      "method": "未知",
      "details": "请自行选择交通方式",
      "cost": 0
    }
  }
}
```

**现在（有出发地）：**
```json
{
  "transportation": {
    "to_destination": {
      "method": "高铁",
      "details": "上海虹桥站 → 北京南站，G101 次",
      "cost": 553
    },
    "from_destination": {
      "method": "高铁",
      "details": "北京南站 → 上海虹桥站，G102 次",
      "cost": 553
    }
  }
}
```

## 使用指南

### 创建新行程

1. 进入"创建新行程"页面
2. 填写**出发地**（例如：上海、深圳、广州）
3. 填写**目的地**（例如：北京、东京、巴黎）
4. 填写其他信息
5. 生成行程

AI 将自动计算：
- ✅ 往返交通方式（飞机/高铁/汽车）
- ✅ 准确的交通费用
- ✅ 行程时间建议

### 支持语音输入

出发地和目的地都支持语音输入：

1. 点击输入框右侧的麦克风图标
2. 说出地名（例如："上海"）
3. 自动填充到输入框

## 数据库迁移

### 对于现有用户

现有的行程记录中，`origin` 字段将为 `NULL`。这不会影响现有行程的显示和使用。

### 执行迁移

在 Supabase SQL Editor 中运行：

```sql
-- 查看现有数据
SELECT id, destination, origin FROM public.trips LIMIT 10;

-- 如果需要，可以为现有数据设置默认值
UPDATE public.trips
SET origin = '未指定'
WHERE origin IS NULL;
```

## 向后兼容

- ✅ 现有代码完全兼容
- ✅ 没有破坏性更改
- ✅ `origin` 字段可选，不影响现有功能
- ✅ AI prompt 会处理未提供出发地的情况

## 技术细节

### 表单验证

```typescript
// 出发地是必填字段
<Input
  placeholder="例如: 上海、深圳、广州"
  value={formData.origin}
  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
  required
/>
```

### API 处理

```typescript
// API 会保存 origin 到数据库
.insert({
  origin: formData.origin || null,
  destination: formData.destination,
  // ...
})
```

### AI 理解

AI 会根据出发地：
1. 判断最合适的交通方式
2. 查询真实的交通价格
3. 计算行程时间
4. 提供出行建议

## 常见问题

### Q1: 是否必须填写出发地？

**A:** 是的，现在出发地是必填字段，以确保交通费用估算的准确性。

### Q2: 国际旅行如何填写？

**A:** 填写您实际的出发城市即可，例如：
- 出发地：北京
- 目的地：东京

AI 会自动判断需要飞机出行并估算相应费用。

### Q3: 现有行程会受影响吗？

**A:** 不会。现有行程的 `origin` 字段为空，不影响查看和使用。

### Q4: 可以修改已创建行程的出发地吗？

**A:** 当前版本暂不支持编辑行程。如需修改，请删除旧行程并创建新行程。

## 未来优化

计划中的功能：

- [ ] 出发地自动定位
- [ ] 智能推荐交通方式
- [ ] 实时票价查询
- [ ] 多种交通方案对比
- [ ] 转乘优化建议

## 总结

添加出发地字段后，AI 旅行规划师可以：

✅ 更准确地估算交通费用
✅ 推荐最佳交通方式
✅ 提供更合理的行程时间安排
✅ 生成更贴近实际的旅行预算

这使得整个行程规划更加实用和可靠！
