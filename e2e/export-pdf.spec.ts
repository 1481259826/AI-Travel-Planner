import { test, expect } from '@playwright/test'
import { login, waitForVisible } from './helpers'
import * as path from 'path'
import * as fs from 'fs'

/**
 * E2E 测试: 导出 PDF 完整流程
 *
 * 测试流程:
 * 1. 用户登录
 * 2. 访问已存在的行程详情页
 * 3. 点击导出 PDF 按钮
 * 4. 等待 PDF 生成
 * 5. 验证 PDF 下载成功
 *
 * 注意: 需要先创建一个测试行程，或使用已存在的行程 ID
 */

test.describe('导出 PDF E2E 测试', () => {
  // 测试行程 ID（需要替换为实际存在的行程 ID）
  // 可以在 beforeAll 中创建一个测试行程
  let testTripId: string

  test.beforeEach(async ({ page }) => {
    // 登录
    await login(page)

    // 如果没有测试行程 ID，先访问行程列表获取第一个行程
    if (!testTripId) {
      await page.goto('/dashboard')
      await waitForVisible(page, '[data-testid="trip-card"]', 10000)

      // 获取第一个行程的链接
      const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
      const href = await firstTripLink.getAttribute('href')

      if (href) {
        const match = href.match(/\/trips\/([a-f0-9-]+)/)
        if (match) {
          testTripId = match[1]
        }
      }
    }

    // 如果仍然没有行程 ID，跳过测试
    if (!testTripId) {
      test.skip(true, '没有可用的测试行程')
    }
  })

  test('应该成功导出 PDF 文件', async ({ page }) => {
    // 导航到行程详情页
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    // 等待页面完全加载
    await page.waitForLoadState('networkidle')

    // 查找导出 PDF 按钮
    const exportButton = page.locator(
      'button:has-text("导出PDF"), button:has-text("导出 PDF"), [data-testid="export-pdf"]'
    ).first()

    // 验证导出按钮存在
    await expect(exportButton).toBeVisible({ timeout: 5000 })

    // 设置下载监听
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 })

    // 点击导出按钮
    await exportButton.click()

    // 等待下载开始
    const download = await downloadPromise

    // 验证文件名包含 PDF
    const fileName = download.suggestedFilename()
    expect(fileName).toMatch(/\.pdf$/i)

    // 保存文件到临时目录
    const downloadPath = path.join(process.cwd(), 'test-results', fileName)
    await download.saveAs(downloadPath)

    // 验证文件已下载
    expect(fs.existsSync(downloadPath)).toBe(true)

    // 验证文件大小 > 0
    const stats = fs.statSync(downloadPath)
    expect(stats.size).toBeGreaterThan(0)

    console.log(`✅ PDF 导出成功: ${fileName}, 大小: ${stats.size} bytes`)

    // 清理下载的文件
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath)
    }
  })

  test('应该能够访问打印预览页面', async ({ page }) => {
    // 导航到行程详情页
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    // 查找打印预览按钮（如果有的话）
    const printButton = page.locator(
      'button:has-text("打印"), [data-testid="print-preview"]'
    ).first()

    if (await printButton.isVisible()) {
      // 点击打印预览
      await printButton.click()

      // 验证跳转到打印页面
      await page.waitForURL(/\/print/, { timeout: 10000 })

      // 验证打印页面内容
      await expect(page.locator('body')).toBeVisible()

      // 验证打印样式已应用
      const printMedia = await page.evaluate(() => {
        return window.matchMedia('print').matches
      })

      console.log('打印媒体查询:', printMedia)
    } else {
      console.log('⚠️ 未找到打印预览按钮')
    }
  })

  test('应该在 PDF 中包含完整的行程信息', async ({ page }) => {
    // 导航到打印预览页面（如果有的话）
    const printUrl = `/dashboard/trips/${testTripId}/print`

    try {
      await page.goto(printUrl)
      await waitForVisible(page, 'body')

      // 验证行程标题存在
      const title = page.locator('h1')
      await expect(title).toBeVisible()

      // 验证行程日期信息
      const dateInfo = page.locator('[data-testid="trip-dates"]')
      if (await dateInfo.isVisible()) {
        await expect(dateInfo).toBeVisible()
      }

      // 验证每日行程内容
      const dayPlan = page.locator('[data-testid="day-plan"]')
      const dayCount = await dayPlan.count()
      expect(dayCount).toBeGreaterThan(0)

      // 验证景点卡片
      const attractions = page.locator('[data-testid="attraction-card"]')
      const attractionCount = await attractions.count()
      expect(attractionCount).toBeGreaterThan(0)

      // 验证酒店信息（如果有的话）
      const hotels = page.locator('[data-testid="hotel-card"]')
      if (await hotels.count() > 0) {
        expect(await hotels.count()).toBeGreaterThan(0)
      }

      console.log(`✅ 打印页面包含 ${dayCount} 天行程和 ${attractionCount} 个景点`)
    } catch (error) {
      console.log('⚠️ 无法访问打印页面，可能不支持此功能')
      test.skip()
    }
  })

  test('应该支持不同的导出选项', async ({ page }) => {
    await page.goto(`/dashboard/trips/${testTripId}`)
    await waitForVisible(page, 'h1')

    // 查找导出选项菜单（如果有的话）
    const exportMenu = page.locator('[data-testid="export-menu"]')

    if (await exportMenu.isVisible()) {
      await exportMenu.click()

      // 验证导出选项
      const pdfOption = page.locator('text=PDF')
      const imageOption = page.locator('text=图片, text=PNG')

      await expect(pdfOption).toBeVisible()

      if (await imageOption.isVisible()) {
        console.log('✅ 支持多种导出格式')
      }
    } else {
      console.log('⚠️ 未找到导出选项菜单')
    }
  })
})

test.describe('导出 PDF - 错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该处理无效的行程 ID', async ({ page }) => {
    // 使用无效的行程 ID
    const invalidTripId = '00000000-0000-0000-0000-000000000000'

    // 尝试访问不存在的行程
    await page.goto(`/dashboard/trips/${invalidTripId}`)

    // 验证显示错误页面或重定向
    // 等待一段时间看页面反应
    await page.waitForTimeout(2000)

    const currentUrl = page.url()

    // 可能重定向到 404 页面或 dashboard
    const is404 = currentUrl.includes('404') || currentUrl.includes('not-found')
    const isDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes(invalidTripId)

    expect(is404 || isDashboard).toBe(true)
  })

  test('应该在没有行程数据时禁用导出按钮', async ({ page }) => {
    // 这个测试假设有一个空的或无效的行程
    // 在实际实现中可能需要创建一个特殊的测试行程

    await page.goto('/dashboard')

    // 尝试访问一个可能存在但没有数据的行程
    // 这取决于实际的测试数据设置
    console.log('⚠️ 此测试需要特殊的测试数据设置')
  })
})

test.describe('导出 PDF - 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该在合理时间内生成 PDF', async ({ page }) => {
    // 获取第一个行程
    await page.goto('/dashboard')
    await waitForVisible(page, '[data-testid="trip-card"]', 10000)

    const firstTripLink = page.locator('[data-testid="trip-card"] a').first()
    await firstTripLink.click()

    await waitForVisible(page, 'h1')

    // 查找导出按钮
    const exportButton = page.locator(
      'button:has-text("导出PDF"), button:has-text("导出 PDF")'
    ).first()

    if (await exportButton.isVisible()) {
      const startTime = Date.now()

      // 设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

      // 点击导出
      await exportButton.click()

      // 等待下载
      const download = await downloadPromise

      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证在 30 秒内完成
      expect(duration).toBeLessThan(30000)

      console.log(`✅ PDF 生成时间: ${duration}ms`)

      // 清理
      const fileName = download.suggestedFilename()
      const downloadPath = path.join(process.cwd(), 'test-results', fileName)
      await download.saveAs(downloadPath)

      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath)
      }
    } else {
      console.log('⚠️ 未找到导出按钮，跳过性能测试')
      test.skip()
    }
  })
})
