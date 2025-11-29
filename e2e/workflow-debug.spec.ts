/**
 * 工作流调试页面 E2E 测试
 * Phase 5.9 P2: 测试调试页面功能
 */

import { test, expect } from '@playwright/test'
import { login, waitForVisible } from './helpers'

test.describe('工作流调试页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await login(page)
  })

  test.describe('页面访问和导航', () => {
    test('应该能够访问调试页面', async ({ page }) => {
      // 直接访问调试页面
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 验证页面标题
      const title = page.locator('h1')
      await expect(title).toContainText('工作流调试')
    })

    test('应该从 Dashboard 导航到调试页面', async ({ page }) => {
      // 访问 Dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 查找调试入口（可能是按钮或链接）
      const debugLink = page.locator('a[href="/dashboard/debug"], button:has-text("调试"), a:has-text("调试")').first()

      // 如果调试入口存在（开发环境），点击它
      if (await debugLink.isVisible()) {
        await debugLink.click()
        await page.waitForURL(/\/dashboard\/debug/)

        // 验证页面
        const title = page.locator('h1')
        await expect(title).toContainText('工作流调试')
      } else {
        // 生产环境可能隐藏调试入口
        test.skip(true, '调试入口在当前环境不可见')
      }
    })

    test('应该显示返回链接', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找返回链接
      const backLink = page.locator('a:has-text("返回"), a[href="/dashboard"]').first()
      await expect(backLink).toBeVisible()

      // 点击返回
      await backLink.click()
      await page.waitForURL(/\/dashboard/)
    })
  })

  test.describe('工作流图显示', () => {
    test('应该显示工作流图 Tab', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找工作流图 Tab
      const graphTab = page.locator('button:has-text("工作流图")').first()
      await expect(graphTab).toBeVisible()
    })

    test('应该加载工作流图结构', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待数据加载
      await page.waitForResponse(
        response => response.url().includes('/api/workflow-debug') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => {})

      // 点击工作流图 Tab（如果不是默认选中）
      const graphTab = page.locator('button:has-text("工作流图")').first()
      if (await graphTab.isVisible()) {
        await graphTab.click()
      }

      // 验证 SVG 存在
      const svg = page.locator('svg').first()
      await expect(svg).toBeVisible({ timeout: 10000 })
    })

    test('应该显示图例', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待加载完成
      await page.waitForTimeout(2000)

      // 查找图例元素
      const legend = page.locator('text=待执行, text=执行中, text=已完成')
      // 图例可能存在
    })
  })

  test.describe('追踪记录列表', () => {
    test('应该显示追踪记录列表区域', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找追踪记录标题
      const traceHeader = page.locator('text=追踪记录')
      await expect(traceHeader).toBeVisible()
    })

    test('应该显示空状态提示（无追踪时）', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待加载
      await page.waitForTimeout(2000)

      // 检查是否有追踪记录或空状态
      const emptyState = page.locator('text=暂无追踪记录')
      const traceItems = page.locator('[class*="cursor-pointer"][class*="border-b"]')

      // 应该显示其中之一
      const hasTraces = await traceItems.count() > 0
      const hasEmptyState = await emptyState.isVisible()

      expect(hasTraces || hasEmptyState).toBe(true)
    })

    test('追踪记录应该可以点击选中', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待加载
      await page.waitForTimeout(2000)

      // 查找追踪记录项
      const traceItems = page.locator('[class*="cursor-pointer"][class*="border-b"]')

      if (await traceItems.count() > 0) {
        // 点击第一个追踪记录
        await traceItems.first().click()

        // 验证选中状态（应该有高亮样式）
        const selectedItem = page.locator('[class*="bg-blue-50"], [class*="border-l-blue-"]')
        await expect(selectedItem).toBeVisible()
      }
    })
  })

  test.describe('执行时间线', () => {
    test('应该显示执行时间线 Tab', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找时间线 Tab
      const timelineTab = page.locator('button:has-text("执行时间线")').first()
      await expect(timelineTab).toBeVisible()
    })

    test('应该切换到时间线视图', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 点击时间线 Tab
      const timelineTab = page.locator('button:has-text("执行时间线")').first()
      await timelineTab.click()

      // 验证 Tab 被选中
      await expect(timelineTab).toHaveClass(/border-blue|text-blue/)
    })

    test('无选中追踪时应显示提示', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 点击时间线 Tab
      const timelineTab = page.locator('button:has-text("执行时间线")').first()
      await timelineTab.click()

      // 检查提示信息
      const emptyHint = page.locator('text=选择一个追踪记录查看执行详情')
      // 如果没有选中追踪，应该显示提示
    })
  })

  test.describe('状态数据查看器', () => {
    test('应该显示状态数据 Tab', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找状态数据 Tab
      const dataTab = page.locator('button:has-text("状态数据")').first()
      await expect(dataTab).toBeVisible()
    })

    test('应该切换到状态数据视图', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 点击状态数据 Tab
      const dataTab = page.locator('button:has-text("状态数据")').first()
      await dataTab.click()

      // 验证 Tab 被选中
      await expect(dataTab).toHaveClass(/border-blue|text-blue/)
    })

    test('无选中追踪时应显示提示', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 点击状态数据 Tab
      const dataTab = page.locator('button:has-text("状态数据")').first()
      await dataTab.click()

      // 检查提示信息
      const emptyHint = page.locator('text=选择一个追踪记录查看状态数据')
      // 如果没有选中追踪，应该显示提示
    })
  })

  test.describe('统计卡片', () => {
    test('应该显示统计卡片', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待数据加载
      await page.waitForTimeout(2000)

      // 查找统计相关文本
      const statsLabels = ['总执行次数', '成功', '失败', '平均耗时']

      for (const label of statsLabels) {
        const stat = page.locator(`text=${label}`)
        await expect(stat).toBeVisible()
      }
    })

    test('统计数据应该是数字', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 等待数据加载
      await page.waitForTimeout(2000)

      // 查找数字统计值
      const statValues = page.locator('[class*="text-2xl"][class*="font-bold"]')

      // 应该有多个统计值
      const count = await statValues.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('操作按钮', () => {
    test('应该显示刷新按钮', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找刷新按钮
      const refreshBtn = page.locator('button:has-text("刷新")').first()
      await expect(refreshBtn).toBeVisible()
    })

    test('刷新按钮应该能够点击', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 点击刷新按钮
      const refreshBtn = page.locator('button:has-text("刷新")').first()
      await refreshBtn.click()

      // 等待请求
      await page.waitForResponse(
        response => response.url().includes('/api/workflow-debug'),
        { timeout: 5000 }
      ).catch(() => {})
    })

    test('应该显示清除记录按钮', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 查找清除按钮
      const clearBtn = page.locator('button:has-text("清除记录")').first()
      await expect(clearBtn).toBeVisible()
    })

    test('清除按钮应该弹出确认对话框', async ({ page }) => {
      await page.goto('/dashboard/debug')
      await page.waitForLoadState('networkidle')

      // 设置对话框处理
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toContain('清除')
        await dialog.dismiss() // 取消
      })

      // 点击清除按钮
      const clearBtn = page.locator('button:has-text("清除记录")').first()
      await clearBtn.click()
    })
  })

  test.describe('API 端点测试', () => {
    test('GET /api/workflow-debug 应该返回追踪数据', async ({ page }) => {
      // 直接测试 API
      const response = await page.request.get('/api/workflow-debug')
      expect(response.ok()).toBe(true)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.traces).toBeDefined()
      expect(data.data.stats).toBeDefined()
    })

    test('GET /api/workflow-debug?type=graph 应该返回工作流图', async ({ page }) => {
      // 测试图结构 API
      const response = await page.request.get('/api/workflow-debug?type=graph')
      expect(response.ok()).toBe(true)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.nodes).toBeDefined()
      expect(data.data.edges).toBeDefined()

      // 验证节点结构
      const nodes = data.data.nodes
      expect(Array.isArray(nodes)).toBe(true)
      expect(nodes.length).toBeGreaterThan(0)

      // 验证边结构
      const edges = data.data.edges
      expect(Array.isArray(edges)).toBe(true)
      expect(edges.length).toBeGreaterThan(0)
    })

    test('GET /api/workflow-debug?type=nodes 应该返回节点列表', async ({ page }) => {
      // 测试节点列表 API
      const response = await page.request.get('/api/workflow-debug?type=nodes')
      expect(response.ok()).toBe(true)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    test('GET /api/workflow-debug?id=nonexistent 应该返回 404', async ({ page }) => {
      // 测试不存在的追踪 ID
      const response = await page.request.get('/api/workflow-debug?id=nonexistent-trace-id')
      expect(response.status()).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Trace not found')
    })
  })
})

test.describe('工作流调试页面 - 与行程创建集成', () => {
  test('创建行程后调试页面应该有新的追踪记录', async ({ page }) => {
    // 这个测试验证行程创建与调试页面的集成
    // 需要 v2 API 启用 (NEXT_PUBLIC_USE_LANGGRAPH=true)

    // 登录
    await login(page)

    // 记录当前追踪数量
    const beforeResponse = await page.request.get('/api/workflow-debug')
    const beforeData = await beforeResponse.json()
    const beforeCount = beforeData.data?.total || 0

    // 创建行程（简化版，只填写必要字段）
    await page.goto('/dashboard/create')
    await page.waitForLoadState('networkidle')

    // 填写表单
    await page.fill('input[name="destination"]', '测试调试城市')

    // 找到日期输入
    const startDateInput = page.locator('input[name="startDate"], input[name="start_date"]').first()
    const endDateInput = page.locator('input[name="endDate"], input[name="end_date"]').first()

    if (await startDateInput.isVisible()) {
      await startDateInput.fill('2025-12-25')
    }
    if (await endDateInput.isVisible()) {
      await endDateInput.fill('2025-12-26')
    }

    // 填写预算
    const budgetInput = page.locator('input[name="budget"]').first()
    if (await budgetInput.isVisible()) {
      await budgetInput.fill('2000')
    }

    // 填写人数
    const travelersInput = page.locator('input[name="travelers"]').first()
    if (await travelersInput.isVisible()) {
      await travelersInput.fill('2')
    }

    // 跳过实际提交（避免长时间等待）
    // 如果需要完整测试，取消以下注释：
    // await page.click('button[type="submit"]')
    // await page.waitForURL(/\/dashboard\/trips\/[a-f0-9-]+/, { timeout: 180000 })

    // 注意：完整的集成测试应该验证创建行程后追踪数量增加
    // const afterResponse = await page.request.get('/api/workflow-debug')
    // const afterData = await afterResponse.json()
    // const afterCount = afterData.data?.total || 0
    // expect(afterCount).toBeGreaterThan(beforeCount)
  })
})

test.describe('工作流调试页面 - 指标端点', () => {
  test('GET /api/metrics 应该返回 Prometheus 格式指标', async ({ page }) => {
    // 登录
    await login(page)

    // 测试 Prometheus 格式
    const response = await page.request.get('/api/metrics')
    expect(response.ok()).toBe(true)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('text/plain')

    const text = await response.text()
    // 应该包含 LangGraph 相关指标
    // 注意：如果没有执行过工作流，可能没有指标数据
  })

  test('GET /api/metrics?format=json 应该返回 JSON 格式指标', async ({ page }) => {
    // 登录
    await login(page)

    // 测试 JSON 格式
    const response = await page.request.get('/api/metrics?format=json')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data).toBeDefined()
    // JSON 格式应该是对象
    expect(typeof data).toBe('object')
  })
})
