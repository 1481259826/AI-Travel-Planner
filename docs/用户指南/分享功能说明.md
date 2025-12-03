# 行程分享功能文档

## 概述

行程分享功能允许用户将自己创建的旅行行程分享给他人，支持公开/私密模式切换、二维码生成、社交媒体分享等功能。

## 功能特性

### 1. 分享链接生成
- 为每个行程生成唯一的分享 token
- 支持公开/私密模式切换
- Token 使用 UUID 格式，确保唯一性和安全性

### 2. 分享控制
- **公开模式**：任何拥有链接的人都可以访问
- **私密模式**：只有行程所有者可以访问
- 可随时切换分享状态

### 3. 分享方式
- **直接链接**：复制分享链接
- **二维码**：生成二维码供扫描访问
- **社交媒体**：支持分享到微信、微博、Twitter

### 4. 分享页面优化
- 美观的只读展示
- 响应式设计，适配移动端和桌面端
- 支持打印功能
- SEO 优化（Open Graph 标签）

## 数据库结构

### trips 表新增字段

```sql
-- 分享 token（唯一标识符）
share_token TEXT UNIQUE

-- 是否公开分享
is_public BOOLEAN DEFAULT FALSE NOT NULL
```

### 索引

```sql
-- 分享 token 索引（优化查询）
CREATE INDEX idx_trips_share_token ON public.trips(share_token) WHERE share_token IS NOT NULL;

-- 公开状态索引
CREATE INDEX idx_trips_is_public ON public.trips(is_public) WHERE is_public = TRUE;
```

### RLS 策略

```sql
-- 允许任何人查看公开的行程
CREATE POLICY "Anyone can view public trips"
  ON public.trips FOR SELECT
  USING (is_public = TRUE AND share_token IS NOT NULL);

-- 允许查看公开行程的费用信息
CREATE POLICY "Anyone can view expenses for public trips"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = expenses.trip_id
      AND trips.is_public = TRUE
      AND trips.share_token IS NOT NULL
    )
  );
```

## API 端点

### 1. 生成/更新分享链接

**端点**：`POST /api/trips/[id]/share`

**请求体**：
```json
{
  "is_public": true
}
```

**响应**：
```json
{
  "share_token": "abc123...",
  "share_url": "https://your-domain.com/share/abc123...",
  "is_public": true
}
```

### 2. 取消分享

**端点**：`DELETE /api/trips/[id]/share`

**响应**：
```json
{
  "message": "已取消分享"
}
```

### 3. 获取公开行程

**端点**：`GET /api/trips/share/[token]`

**响应**：
```json
{
  "trip": {
    "id": "...",
    "destination": "上海",
    "start_date": "2025-11-01",
    "end_date": "2025-11-05",
    "travelers": 2,
    "itinerary": { ... },
    "profiles": {
      "name": "用户名"
    },
    "expenses": [ ... ]
  }
}
```

## 组件使用

### ShareButton 组件

```tsx
import ShareButton from '@/components/ShareButton'

function TripDetail() {
  const [trip, setTrip] = useState<Trip>(...)

  const handleShareUpdate = (shareToken: string, isPublic: boolean) => {
    setTrip({
      ...trip,
      share_token: shareToken,
      is_public: isPublic
    })
  }

  return (
    <div>
      <ShareButton
        trip={trip}
        onShareUpdate={handleShareUpdate}
      />
    </div>
  )
}
```

### 组件功能

- 弹窗式交互界面
- 公开/私密切换开关
- 分享链接复制
- 二维码显示/隐藏
- 社交媒体分享按钮
- 错误提示

## 分享页面路由

**路由**：`/share/[token]`

**特性**：
- 服务端渲染（SSR）
- 动态元数据生成（SEO 优化）
- Open Graph 标签
- 只读展示模式
- 打印友好布局

## 工具函数

### lib/share.ts

```typescript
// 生成唯一的分享 token
generateShareToken(): string

// 生成完整的分享 URL
getShareUrl(token: string, baseUrl?: string): string

// 复制文本到剪贴板
copyToClipboard(text: string): Promise<boolean>

// 为行程生成或更新分享链接
generateTripShareLink(tripId: string, isPublic: boolean): Promise<...>

// 通过 token 获取公开的行程
getTripByShareToken(token: string): Promise<...>

// 生成二维码 URL
getQRCodeUrl(text: string): string

// 格式化分享文本
formatShareText(trip: { ... }): string
```

## 安全考虑

### 1. Token 生成
- 使用 `crypto.randomUUID()` 生成随机 UUID
- 去除连字符，增加 token 长度
- 数据库唯一性约束防止冲突

### 2. 权限控制
- 验证用户是否拥有行程的所有权
- 私密行程需要登录验证
- 公开行程通过 RLS 策略控制访问

### 3. 数据脱敏
- 公开分享不显示用户邮箱
- 不显示用户的费用预算（可选）
- 只读模式防止数据修改

### 4. 防止滥用
- 分享链接不可遍历（UUID 格式）
- 可随时取消分享
- Token 不会被回收（保持链接稳定性）

## 使用流程

### 1. 生成分享链接

1. 用户在行程详情页点击"分享行程"按钮
2. 打开分享弹窗
3. 开启"公开分享"开关
4. 系统自动生成唯一的分享链接
5. 用户可以：
   - 复制链接
   - 查看/保存二维码
   - 分享到社交媒体

### 2. 访问分享页面

1. 其他用户通过分享链接访问
2. 系统验证 token 有效性和公开状态
3. 展示美观的只读行程详情
4. 支持打印和保存

### 3. 管理分享

- **切换公开/私密**：关闭开关即可停止分享
- **重新分享**：再次开启时使用相同的链接
- **删除行程**：行程删除后分享链接自动失效

## 前端交互

### 分享按钮状态

```typescript
// 未分享
is_public: false
share_token: null

// 已公开分享
is_public: true
share_token: "abc123..."

// 已生成链接但未公开
is_public: false
share_token: "abc123..."  // 保留 token，方便重新分享
```

### 复制成功提示

- 复制成功后显示"已复制!"提示
- 2 秒后自动消失
- 复制失败显示错误提示

### 二维码显示

- 点击"显示二维码"按钮展开
- 使用在线服务生成二维码图片
- 支持保存和扫描

## 环境变量

```env
# 应用基础 URL（用于生成完整的分享链接）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 数据库迁移

运行以下 SQL 脚本来添加分享功能：

```bash
# 在 Supabase SQL Editor 中运行
supabase-share-migration.sql
```

## 测试检查清单

- [ ] 生成分享链接成功
- [ ] 公开/私密切换正常工作
- [ ] 复制链接到剪贴板成功
- [ ] 二维码正常显示
- [ ] 分享页面正常访问
- [ ] 私密行程无法通过分享链接访问
- [ ] 删除行程后分享链接失效
- [ ] SEO 标签正确生成
- [ ] 移动端响应式正常
- [ ] 打印布局正常

## 未来改进

- [ ] 添加访问统计
- [ ] 支持自定义分享封面图
- [ ] 支持分享有效期设置
- [ ] 添加分享密码保护
- [ ] 支持更多社交平台
- [ ] 生成分享海报
- [ ] 导出为 PDF

## 故障排查

### 问题：分享链接无法访问

**可能原因**：
1. 行程未设置为公开（`is_public = false`）
2. Token 无效或不存在
3. 行程已被删除

**解决方法**：
1. 检查 `is_public` 字段值
2. 验证 `share_token` 是否正确
3. 确认行程在数据库中存在

### 问题：无法生成分享链接

**可能原因**：
1. 用户未登录
2. 无权限访问该行程
3. 数据库错误

**解决方法**：
1. 确认用户已登录
2. 验证用户是否为行程所有者
3. 查看服务器日志

### 问题：二维码不显示

**可能原因**：
1. 网络问题
2. 二维码服务不可用

**解决方法**：
1. 检查网络连接
2. 考虑使用本地二维码库（如 qrcode.react）

## 参考资料

- [Supabase RLS 文档](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js 动态路由](https://nextjs.org/docs/routing/dynamic-routes)
- [Open Graph 协议](https://ogp.me/)
