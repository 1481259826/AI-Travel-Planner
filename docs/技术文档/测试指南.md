# 测试指南

本文档介绍如何在 AI 旅行规划师项目中编写和运行测试。

## 目录

- [快速开始](#快速开始)
- [测试框架](#测试框架)
- [运行测试](#运行测试)
- [编写测试](#编写测试)
- [Mock 使用指南](#mock-使用指南)
- [测试辅助函数](#测试辅助函数)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 快速开始

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test -- __tests__/lib/utils.test.ts

# 监听模式（开发时使用）
npm test -- --watch

# 运行大量测试时增加内存
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

---

## 测试框架

项目使用以下测试工具：

- **Vitest** - 测试运行器，兼容 Jest API
- **Testing Library** - React 组件测试
- **MSW** - API Mocking
- **fake-indexeddb** - IndexedDB 模拟

### 配置文件

- `vitest.config.ts` - Vitest 配置
- `vitest.setup.ts` - 测试环境设置

### 覆盖率阈值

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80
  }
}
```

---

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 带覆盖率
npm test -- --coverage

# UI 模式（交互式）
npm test -- --ui

# 只运行失败的测试
npm test -- --changed
```

### 过滤测试

```bash
# 按文件名模式
npm test -- encryption

# 按测试名称
npm test -- -t "should encrypt"

# 按目录
npm test -- __tests__/lib/
```

### 调试测试

```bash
# 单个测试详细输出
npm test -- --reporter=verbose

# 显示 console.log
npm test -- --silent=false
```

---

## 编写测试

### 目录结构

```
__tests__/
├── api/                    # API 路由测试
│   ├── generate-itinerary.test.ts
│   ├── trips.test.ts
│   └── user/
├── components/             # 组件测试
│   ├── shared/
│   ├── map/
│   └── settings/
├── integration/            # 集成测试
│   ├── trip-generation.test.ts
│   └── offline-sync.test.ts
├── lib/                    # 工具库测试
│   ├── api-keys/
│   ├── database/
│   └── utils/
├── mocks/                  # Mock 文件
│   ├── index.ts
│   ├── supabase.ts
│   ├── amap.ts
│   └── ai-models.ts
└── utils/                  # 测试辅助函数
    └── test-helpers.ts
```

### 基本测试结构

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('功能名称', () => {
  beforeEach(() => {
    // 每个测试前的设置
  })

  afterEach(() => {
    // 每个测试后的清理
    vi.clearAllMocks()
  })

  describe('子功能', () => {
    it('应该做某事', () => {
      // 准备
      const input = 'test'

      // 执行
      const result = myFunction(input)

      // 断言
      expect(result).toBe('expected')
    })
  })
})
```

### 组件测试示例

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)

    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const onClick = vi.fn()
    render(<MyComponent onClick={onClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

### API 路由测试示例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET, POST } from '@/app/api/my-route/route'
import { createTestRequest, createTestUser } from '@/__tests__/utils/test-helpers'

describe('API: /api/my-route', () => {
  beforeEach(() => {
    vi.mock('@/lib/database', () => ({
      supabase: createMockSupabaseClient(),
    }))
  })

  it('should return data for authenticated user', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost/api/my-route',
      'test-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('result')
  })
})
```

---

## Mock 使用指南

### 统一导入

```typescript
import {
  mockUser,
  mockTrip,
  createMockSupabaseClient,
  setupAMapMock,
  mockGeneratedItinerary,
} from '@/__tests__/mocks'
```

### Supabase Mock

```typescript
import { createMockSupabaseClient, mockUser, mockTrip } from '@/__tests__/mocks'

// 基本使用
const supabase = createMockSupabaseClient()

// 自定义选项
const supabase = createMockSupabaseClient({
  profileExists: false,        // profile 不存在
  tripInsertSuccess: true,     // 插入成功
  apiKeys: [mockApiKey],       // 预设 API Keys
})

// Mock 认证中间件
vi.mock('@/lib/auth', () => ({
  requireAuth: createMockAuthMiddleware({
    authenticated: true,
    user: mockUser,
  }),
}))
```

### 高德地图 Mock

```typescript
import { setupAMapMock, cleanupAMapMock, mockAMapLoaderLoaded } from '@/__tests__/mocks'

beforeEach(() => {
  setupAMapMock()
})

afterEach(() => {
  cleanupAMapMock()
})

// Mock useAMapLoader hook
vi.mock('@/hooks/useAMapLoader', () => ({
  useAMapLoader: () => mockAMapLoaderLoaded,
}))
```

### AI 模型 Mock

```typescript
import { createMockAIClient, mockGeneratedItinerary } from '@/__tests__/mocks'

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => createMockAIClient()),
}))
```

---

## 测试辅助函数

### 数据生成器

```typescript
import {
  createTestUser,
  createTestProfile,
  createTestTrip,
  createTestExpense,
  createTestItinerary,
  createTestActivity,
  createTestApiKey,
} from '@/__tests__/utils/test-helpers'

// 创建测试数据
const user = createTestUser()
const profile = createTestProfile(user.id, { theme: 'dark' })
const trip = createTestTrip(user.id, { destination: '北京' })
const expense = createTestExpense(trip.id, user.id, { amount: 500 })
```

### Request 辅助函数

```typescript
import {
  createTestRequest,
  createAuthenticatedRequest,
} from '@/__tests__/utils/test-helpers'

// 普通请求
const request = createTestRequest('http://localhost/api/test', {
  method: 'POST',
  body: { name: 'test' },
})

// 带认证的请求
const authRequest = createAuthenticatedRequest(
  'http://localhost/api/test',
  'my-token',
  { method: 'GET' }
)
```

### 异步辅助函数

```typescript
import { wait, waitFor, waitForAll } from '@/__tests__/utils/test-helpers'

// 等待指定时间
await wait(100)

// 等待条件满足
await waitFor(() => element.isVisible, { timeout: 5000 })

// 等待所有 Promise
const results = await waitForAll([promise1, promise2])
```

### 断言辅助函数

```typescript
import {
  expectSuccessResponse,
  expectErrorResponse,
  expectToContain,
  expectLength,
} from '@/__tests__/utils/test-helpers'

// API 响应断言
const data = await expectSuccessResponse(response)
const error = await expectErrorResponse(response, 404)

// 对象属性断言
expectToContain(user, { name: 'Test', role: 'admin' })

// 数组长度断言
expectLength(items, 5)
```

---

## 最佳实践

### 1. 测试文件命名

- 工具库: `__tests__/lib/[module-name].test.ts`
- 组件: `__tests__/components/[ComponentName].test.tsx`
- API: `__tests__/api/[route-name].test.ts`
- 集成: `__tests__/integration/[flow-name].test.ts`

### 2. 测试描述清晰

```typescript
// ✅ 好的描述
describe('validatePassword', () => {
  it('should return false when password is shorter than 8 characters', () => {})
  it('should return true when password meets all requirements', () => {})
})

// ❌ 不好的描述
describe('password', () => {
  it('test 1', () => {})
  it('works', () => {})
})
```

### 3. 遵循 AAA 模式

```typescript
it('should calculate total correctly', () => {
  // Arrange (准备)
  const items = [{ price: 100 }, { price: 200 }]

  // Act (执行)
  const total = calculateTotal(items)

  // Assert (断言)
  expect(total).toBe(300)
})
```

### 4. 避免测试实现细节

```typescript
// ✅ 测试行为
it('should display user name', () => {
  render(<UserProfile user={mockUser} />)
  expect(screen.getByText('Test User')).toBeInTheDocument()
})

// ❌ 测试实现
it('should call setState with user name', () => {
  // 不要测试内部状态变化
})
```

### 5. 每个测试独立

```typescript
// ✅ 独立测试
beforeEach(() => {
  vi.clearAllMocks()
  resetTestState()
})

// ❌ 依赖其他测试的状态
let sharedState // 避免
```

### 6. 使用工厂函数

```typescript
// ✅ 使用工厂函数
const user = createTestUser({ email: 'custom@test.com' })

// ❌ 直接写对象
const user = {
  id: 'user-1',
  email: 'test@example.com',
  // ... 很多属性
}
```

---

## 常见问题

### Q: 测试运行时内存不足

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### Q: Mock 没有生效

确保在正确的位置调用 `vi.mock()`：
```typescript
// ✅ 在文件顶部
vi.mock('@/lib/supabase', () => ({ ... }))

// 或在 beforeEach 中
beforeEach(() => {
  vi.mock('@/lib/supabase', () => ({ ... }))
})
```

### Q: 异步测试超时

```typescript
// 增加超时时间
it('should complete async operation', async () => {
  // ...
}, 10000) // 10 秒超时
```

### Q: 组件测试找不到元素

使用正确的查询方法：
```typescript
// 推荐的查询顺序
screen.getByRole('button', { name: 'Submit' })  // 最佳
screen.getByLabelText('Email')                   // 表单
screen.getByText('Hello')                        // 文本
screen.getByTestId('custom-element')             // 最后手段
```

### Q: 如何测试错误情况

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    validateInput(null)
  }).toThrow('Input is required')
})

it('should reject with error', async () => {
  await expect(fetchData('invalid')).rejects.toThrow('Not found')
})
```

---

## CI/CD 集成

项目已配置 GitHub Actions，在以下情况自动运行测试：

- Push 到 `main` 或 `develop` 分支
- 创建 Pull Request

配置文件: `.github/workflows/test.yml`

### Codecov 集成

测试覆盖率报告会自动上传到 Codecov（需要在仓库设置中配置 `CODECOV_TOKEN`）。

---

## 相关文档

- [Vitest 文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [MSW 文档](https://mswjs.io/)
- [测试改进计划](./TESTING_IMPROVEMENT_PLAN.md)
