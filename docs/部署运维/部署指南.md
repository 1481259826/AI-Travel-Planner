# 部署指南

本文档介绍如何将 AI 旅行规划师应用部署到生产环境。

## 部署前检查清单

- [ ] 已配置所有必需的环境变量
- [ ] 已在 Supabase 创建项目并运行数据库迁移
- [ ] 已获取有效的 Anthropic API 密钥
- [ ] 已测试本地开发环境运行正常
- [ ] 已完成代码审查和安全检查

## 推荐部署平台

### 1. Vercel (推荐)

Vercel 是 Next.js 的官方部署平台，提供零配置部署。

#### 步骤：

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   vercel
   ```

4. **配置环境变量**
   在 Vercel Dashboard 中：
   - 进入项目设置 → Environment Variables
   - 添加所有必需的环境变量：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `ANTHROPIC_API_KEY`
     - `BASE_URL`

5. **重新部署**
   ```bash
   vercel --prod
   ```

#### Vercel 配置文件 (可选)

创建 `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"]
}
```

### 2. Netlify

#### 步骤：

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **初始化部署**
   ```bash
   netlify init
   ```

3. **配置构建设置**
   - Build command: `npm run build`
   - Publish directory: `.next`

4. **设置环境变量**
   在 Netlify Dashboard 或使用 CLI：
   ```bash
   netlify env:set ANTHROPIC_API_KEY your_key
   netlify env:set BASE_URL your_base_url
   ```

5. **部署**
   ```bash
   netlify deploy --prod
   ```

### 3. 自托管 (Docker)

#### Dockerfile

创建 `Dockerfile`:
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

#### 部署命令

```bash
# 构建镜像
docker build -t ai-travel-planner .

# 运行容器
docker run -p 3000:3000 --env-file .env.production ai-travel-planner

# 或使用 docker-compose
docker-compose up -d
```

## 环境变量配置

### 生产环境 (.env.production)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Anthropic API
ANTHROPIC_API_KEY=your_production_api_key
BASE_URL=https://api.anthropic.com

# Optional
NEXT_PUBLIC_MAP_API_KEY=your_map_api_key
```

### 安全最佳实践

1. **绝不在客户端暴露敏感密钥**
   - 只有 `NEXT_PUBLIC_*` 前缀的变量会暴露到客户端
   - API 密钥只在服务端使用

2. **使用环境变量管理工具**
   - Vercel: 使用 Dashboard 或 Vercel CLI
   - Netlify: 使用 Dashboard 或 Netlify CLI
   - 自托管: 使用 Docker secrets 或 Kubernetes secrets

3. **定期轮换密钥**
   - 定期更新 API 密钥
   - 使用密钥管理服务（如 AWS Secrets Manager）

## 数据库迁移

### Supabase

1. **在 Supabase Dashboard 运行迁移**
   - 登录 Supabase Dashboard
   - 选择项目 → SQL Editor
   - 粘贴 `supabase-schema.sql` 内容
   - 点击 Run

2. **验证迁移**
   ```sql
   -- 检查表是否创建成功
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

3. **启用 Row Level Security**
   确保所有表都启用了 RLS 策略

## 性能优化

### 1. 启用 Next.js 输出优化

在 `next.config.js` 中：
```javascript
module.exports = {
  output: 'standalone',
  // ... 其他配置
}
```

### 2. 配置缓存策略

```javascript
// app/api/generate-itinerary/route.ts
export const runtime = 'edge' // 使用 Edge Runtime
export const maxDuration = 60 // API 超时时间（秒）
```

### 3. 启用图片优化

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['images.unsplash.com'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

## 监控和日志

### 推荐工具

1. **Vercel Analytics** (如果使用 Vercel)
2. **Sentry** - 错误追踪
3. **LogRocket** - 会话重放
4. **Supabase Dashboard** - 数据库性能监控

### 设置 Sentry

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

## 域名配置

### Vercel

1. 在 Vercel Dashboard 添加自定义域名
2. 配置 DNS 记录：
   - A 记录: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

### SSL 证书

所有推荐平台都自动提供免费 SSL 证书（Let's Encrypt）。

## 备份策略

### Supabase

1. **自动备份**
   - Supabase Pro 计划提供每日自动备份
   - 保留 7 天

2. **手动备份**
   ```bash
   # 导出数据库
   pg_dump -h db.your-project.supabase.co -U postgres your_database > backup.sql
   ```

## 故障排除

### 常见问题

1. **API 调用失败**
   - 检查环境变量是否正确配置
   - 验证 API 密钥有效性
   - 查看 API 配额是否用尽

2. **数据库连接错误**
   - 检查 Supabase URL 和密钥
   - 验证网络连接
   - 检查 RLS 策略

3. **构建失败**
   - 检查 Node.js 版本
   - 清除缓存：`rm -rf .next node_modules && npm install`
   - 查看构建日志

## 回滚策略

### Vercel

```bash
# 查看部署历史
vercel list

# 回滚到特定部署
vercel rollback [deployment-url]
```

### Git 方式

```bash
# 回退到上一个提交
git revert HEAD
git push

# 或回退到特定提交
git revert <commit-hash>
git push
```

## 成本估算

### 免费额度

- **Vercel**: 100GB 带宽/月，商业项目需付费
- **Netlify**: 100GB 带宽/月
- **Supabase**: 500MB 数据库，50GB 带宽/月
- **Anthropic**: 按使用量计费，新用户有免费额度

### 预估月费用（中等流量）

- Hosting: $0-20
- Supabase: $0-25
- Anthropic API: $10-50（取决于使用量）
- **总计**: $10-95/月

## 联系支持

如有部署问题，请：
1. 查看项目 README
2. 查看平台文档
3. 提交 GitHub Issue

---

**祝部署顺利！** 🚀
