# E2E 测试指南

本文档介绍如何运行和编写 AI 旅行规划师项目的端到端（E2E）测试。

## 📋 概述

项目使用 **Playwright** 作为 E2E 测试框架，覆盖以下核心用户流程：
- 创建行程（登录 → 填写表单 → AI 生成 → 查看详情）
- 导出 PDF（查看行程 → 导出文件 → 验证内容）
- 分享行程（创建分享链接 → 匿名访问 → 验证权限）

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

Playwright 已在 `package.json` 中配置为开发依赖（`@playwright/test`）。

### 运行测试

```bash
# 运行所有 E2E 测试（headless 模式）
npm run test:e2e

# 以 UI 模式运行（推荐用于开发）
npm run test:e2e:ui

# 以 headed 模式运行（显示浏览器窗口）
npm run test:e2e:headed

# 调试模式（逐步执行）
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report
```

### 运行特定测试文件

```bash
# 只运行创建行程测试
npx playwright test e2e/create-trip.spec.ts

# 只运行导出 PDF 测试
npx playwright test e2e/export-pdf.spec.ts

# 只运行分享行程测试
npx playwright test e2e/share-trip.spec.ts
```

## ⚙️ 配置

### Playwright 配置文件

配置文件位于 `playwright.config.ts`，主要配置项：

```typescript
{
  baseURL: 'http://localhost:3008',  // 应用的基础 URL
  timeout: 60000,                    // 全局超时时间（60秒）
  retries: process.env.CI ? 2 : 0,   // CI 环境重试 2 次
  workers: process.env.CI ? 1 : undefined,

  // 自动启动开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3008',
    reuseExistingServer: !process.env.CI,
  },
}
```

### 测试用户配置

E2E 测试需要一个测试用户账号。默认测试用户配置在 `e2e/helpers.ts`：

```typescript
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'Test1234!',
}
```

**⚠️ 注意**: 运行测试前，需要在数据库中创建此测试用户，或修改为实际存在的测试账号。

### 环境变量

E2E 测试会读取以下环境变量：

- `BASE_URL` - 应用基础 URL（默认: http://localhost:3008）
- 其他应用所需的环境变量（Supabase、API Keys 等）

## 📁 测试文件结构

```
e2e/
├── helpers.ts              # 测试辅助函数
├── create-trip.spec.ts     # 创建行程测试
├── export-pdf.spec.ts      # 导出 PDF 测试
└── share-trip.spec.ts      # 分享行程测试
```

## 🧪 测试场景

### 1. 创建行程测试 (`create-trip.spec.ts`)

包含 6 个测试场景：

- ✅ 成功创建行程的完整流程
- ✅ 表单必填字段验证
- ✅ 取消创建功能
- ✅ API Key 缺失时的提示
- ✅ 自然语言日期输入
- ✅ 保存草稿功能

**关键点**:
- 测试会调用真实的 AI API（需要配置 API Keys）
- 生成行程可能需要较长时间（最多 2 分钟超时）
- 测试完成后会在数据库中创建新的行程记录

### 2. 导出 PDF 测试 (`export-pdf.spec.ts`)

包含 7 个测试场景：

- ✅ 成功导出 PDF 文件
- ✅ 访问打印预览页面
- ✅ PDF 包含完整行程信息
- ✅ 支持不同的导出选项
- ✅ 错误处理（无效行程 ID）
- ✅ 性能测试（生成时间 < 30秒）

**关键点**:
- 测试会下载 PDF 文件到 `test-results/` 目录
- 测试完成后会自动清理下载的文件
- 需要至少一个已存在的测试行程

### 3. 分享行程测试 (`share-trip.spec.ts`)

包含 9 个测试场景：

- ✅ 创建分享链接
- ✅ 复制链接到剪贴板
- ✅ 匿名用户访问公开链接
- ✅ 取消分享功能
- ✅ 显示分享二维码
- ✅ 权限验证（所有者才能创建分享）
- ✅ 未公开行程访问控制
- ✅ 分享页面显示完整信息
- ✅ 分享链接唯一性

**关键点**:
- 使用无痕浏览器上下文模拟匿名用户
- 测试完成后会清理创建的分享 token
- 涉及多个浏览器上下文的交互

## 🛠️ 编写新的 E2E 测试

### 使用辅助函数

`e2e/helpers.ts` 提供了常用的测试辅助函数：

```typescript
import { login, logout, waitForVisible, fillTripForm } from './helpers'

test('示例测试', async ({ page }) => {
  // 登录
  await login(page)

  // 导航到页面
  await page.goto('/dashboard/create')

  // 等待元素可见
  await waitForVisible(page, 'form')

  // 填写表单
  await fillTripForm(page, {
    destination: '上海',
    startDate: '2025-03-01',
    duration: '3',
  })

  // 提交并验证...
})
```

### 常用 Playwright API

```typescript
// 导航
await page.goto('/dashboard')

// 等待元素
await page.waitForSelector('[data-testid="trip-card"]')
await waitForVisible(page, 'h1')

// 点击
await page.click('button[type="submit"]')

// 填写表单
await page.fill('input[name="destination"]', '北京')

// 断言
await expect(page.locator('h1')).toBeVisible()
expect(page.url()).toContain('/dashboard/trips')

// 获取文本
const title = await page.locator('h1').textContent()

// 等待导航
await page.waitForURL(/\/dashboard\/trips\/[a-f0-9-]+/)
```

## 🐛 调试技巧

### 1. 使用 UI 模式

```bash
npm run test:e2e:ui
```

UI 模式提供：
- 可视化的测试执行
- 时间旅行调试
- 元素选择器工具
- 网络请求查看

### 2. 使用 Debug 模式

```bash
npm run test:e2e:debug
```

Debug 模式会：
- 逐步执行测试
- 在每一步暂停
- 允许你检查页面状态

### 3. 使用 Headed 模式

```bash
npm run test:e2e:headed
```

显示真实的浏览器窗口，方便观察测试执行过程。

### 4. 截图和视频

测试失败时，Playwright 会自动：
- 📸 截取失败时的屏幕截图
- 🎥 录制测试视频（仅失败时保留）

文件保存在 `test-results/` 目录。

### 5. 添加调试断点

```typescript
test('调试示例', async ({ page }) => {
  await page.goto('/dashboard')

  // 暂停测试，允许你手动操作
  await page.pause()

  // 继续执行...
})
```

## 📊 查看测试报告

运行测试后，查看 HTML 报告：

```bash
npm run test:e2e:report
```

报告包含：
- 测试结果汇总
- 失败测试的详细信息
- 截图和视频
- 执行时间统计

## ⚠️ 注意事项

### 1. 测试数据准备

E2E 测试需要真实的数据库环境和测试数据：

- **测试用户**: 需要在数据库中创建测试账号
- **API Keys**: 需要配置 AI 和地图 API Keys
- **测试行程**: 某些测试需要已存在的行程数据

### 2. 测试隔离

- 每个测试应该独立运行，不依赖其他测试
- 测试完成后应清理创建的数据（可选）
- 使用唯一的测试数据避免冲突

### 3. 性能考虑

- E2E 测试比单元测试慢得多
- 避免过度使用 E2E 测试
- 优先编写单元测试和集成测试
- E2E 测试聚焦于关键用户流程

### 4. CI/CD 集成

在 CI/CD 环境中运行 E2E 测试：

```yaml
# .github/workflows/e2e.yml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    BASE_URL: ${{ secrets.BASE_URL }}
    # 其他环境变量...

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### 5. 浏览器兼容性

默认配置只运行 Chromium 测试。如需测试其他浏览器，修改 `playwright.config.ts`：

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

## 📚 相关资源

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [Playwright 测试最佳实践](https://playwright.dev/docs/best-practices)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)
- [项目测试指南](./TESTING_GUIDE.md)
- [测试改进计划](./TESTING_IMPROVEMENT_PLAN.md)

## 🆘 常见问题

### Q: 测试失败提示 "TEST_USER not found"

**A**: 需要在数据库中创建测试用户，或修改 `e2e/helpers.ts` 中的 `TEST_USER` 配置。

### Q: 测试超时

**A**:
- 检查开发服务器是否正常运行
- 增加超时时间（在 `playwright.config.ts` 中配置）
- AI 生成行程需要较长时间，已设置 2 分钟超时

### Q: 端口被占用

**A**:
```bash
npm run cleanup  # 清理僵尸进程
npm run dev      # 重新启动服务器
```

### Q: 如何跳过某些测试

**A**: 使用 `test.skip()`:
```typescript
test.skip('暂时跳过的测试', async ({ page }) => {
  // ...
})
```

### Q: 如何只运行特定的测试

**A**: 使用 `test.only()`:
```typescript
test.only('只运行这个测试', async ({ page }) => {
  // ...
})
```

---

**最后更新**: 2025-01-23
**维护者**: AI Travel Planner Team
