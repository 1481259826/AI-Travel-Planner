/**
 * 分享功能工具函数测试
 *
 * 测试范围：
 * - 生成分享 token
 * - 生成分享 URL
 * - 复制到剪贴板
 * - 生成二维码 URL
 * - 格式化分享文本
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateShareToken,
  getShareUrl,
  copyToClipboard,
  getQRCodeUrl,
  formatShareText,
} from '@/lib/share'

describe('generateShareToken', () => {
  it('应该生成 UUID 格式的 token（无连字符）', () => {
    const token = generateShareToken()

    // 应该是32个字符（UUID 去掉连字符）
    expect(token).toHaveLength(32)
    // 应该只包含十六进制字符
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('应该每次生成不同的 token', () => {
    const token1 = generateShareToken()
    const token2 = generateShareToken()
    const token3 = generateShareToken()

    expect(token1).not.toBe(token2)
    expect(token2).not.toBe(token3)
    expect(token1).not.toBe(token3)
  })

  it('应该生成有效的字符串', () => {
    const token = generateShareToken()

    expect(typeof token).toBe('string')
    expect(token).toBeTruthy()
  })
})

describe('getShareUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_BASE_URL
  const originalWindow = global.window

  beforeEach(() => {
    // 清除环境变量
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  afterEach(() => {
    // 恢复环境变量
    if (originalEnv) {
      process.env.NEXT_PUBLIC_BASE_URL = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_BASE_URL
    }

    // 恢复 window 对象
    if (originalWindow) {
      global.window = originalWindow
    } else {
      // @ts-ignore
      delete global.window
    }
  })

  it('应该使用传入的 baseUrl', () => {
    const token = 'abc123'
    const baseUrl = 'https://example.com'

    const url = getShareUrl(token, baseUrl)

    expect(url).toBe('https://example.com/share/abc123')
  })

  it('应该在没有传入 baseUrl 时使用环境变量', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://env.example.com'
    const token = 'abc123'

    const url = getShareUrl(token)

    expect(url).toBe('https://env.example.com/share/abc123')
  })

  it('应该在浏览器环境中使用 window.location.origin', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL

    // Mock window对象
    ;(global as any).window = {
      location: {
        origin: 'https://window.example.com',
      },
    }

    const token = 'abc123'
    const url = getShareUrl(token)

    expect(url).toBe('https://window.example.com/share/abc123')
  })

  it('应该处理没有任何 baseUrl 的情况', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    // @ts-ignore
    delete global.window

    const token = 'abc123'
    const url = getShareUrl(token)

    expect(url).toBe('/share/abc123')
  })

  it('应该正确拼接 URL 路径', () => {
    const token = 'test-token-123'
    const baseUrl = 'https://example.com'

    const url = getShareUrl(token, baseUrl)

    expect(url).toBe('https://example.com/share/test-token-123')
    expect(url).toContain('/share/')
  })

  it('应该处理 baseUrl 带尾部斜杠的情况', () => {
    const token = 'abc123'
    const baseUrl = 'https://example.com/'

    const url = getShareUrl(token, baseUrl)

    // 会有双斜杠，但在 URL 中通常是有效的
    expect(url).toBe('https://example.com//share/abc123')
  })

  it('应该处理空 token', () => {
    const baseUrl = 'https://example.com'

    const url = getShareUrl('', baseUrl)

    expect(url).toBe('https://example.com/share/')
  })
})

describe('copyToClipboard', () => {
  let mockClipboard: any
  let originalNavigator: any

  beforeEach(() => {
    // Mock navigator.clipboard
    mockClipboard = {
      writeText: vi.fn(),
    }

    originalNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: mockClipboard,
      },
      configurable: true,
      writable: true,
    })

    // Mock document for fallback method
    ;(global as any).document = {
      createElement: vi.fn(() => ({
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: vi.fn(() => true),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()

    if (originalNavigator) {
      global.navigator = originalNavigator
    }
  })

  it('应该使用 navigator.clipboard.writeText 复制文本', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)

    const result = await copyToClipboard('test text')

    expect(result).toBe(true)
    expect(mockClipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('应该在 clipboard API 失败时返回 false', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'))

    const result = await copyToClipboard('test text')

    expect(result).toBe(false)
  })

  it('应该处理空字符串', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)

    const result = await copyToClipboard('')

    expect(result).toBe(true)
    expect(mockClipboard.writeText).toHaveBeenCalledWith('')
  })

  it('应该处理特殊字符', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)

    const specialText = 'Text with\nnew lines\tand\ttabs'
    const result = await copyToClipboard(specialText)

    expect(result).toBe(true)
    expect(mockClipboard.writeText).toHaveBeenCalledWith(specialText)
  })

  it('应该处理长文本', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)

    const longText = 'A'.repeat(10000)
    const result = await copyToClipboard(longText)

    expect(result).toBe(true)
    expect(mockClipboard.writeText).toHaveBeenCalledWith(longText)
  })

  it('应该在没有 navigator 时尝试降级方案', async () => {
    // Remove navigator
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      configurable: true,
    })

    const result = await copyToClipboard('test text')

    // 降级方案在测试环境中可能不完全工作，但应该不抛出错误
    expect(typeof result).toBe('boolean')
  })
})

describe('getQRCodeUrl', () => {
  it('应该生成正确的二维码 URL', () => {
    const text = 'https://example.com/share/abc123'

    const qrUrl = getQRCodeUrl(text)

    expect(qrUrl).toContain('api.qrserver.com')
    expect(qrUrl).toContain('create-qr-code')
    expect(qrUrl).toContain(encodeURIComponent(text))
  })

  it('应该正确编码特殊字符', () => {
    const text = 'https://example.com/share/abc?query=value&foo=bar'

    const qrUrl = getQRCodeUrl(text)

    // URL应该被正确编码
    expect(qrUrl).toContain(encodeURIComponent(text))
    expect(qrUrl).not.toContain('&foo=bar') // 应该被编码
  })

  it('应该处理中文字符', () => {
    const text = '我的旅行计划'

    const qrUrl = getQRCodeUrl(text)

    expect(qrUrl).toContain(encodeURIComponent(text))
    expect(qrUrl).toContain('%')
  })

  it('应该包含尺寸参数', () => {
    const text = 'test'

    const qrUrl = getQRCodeUrl(text)

    expect(qrUrl).toContain('size=200x200')
  })

  it('应该处理空字符串', () => {
    const qrUrl = getQRCodeUrl('')

    expect(qrUrl).toContain('api.qrserver.com')
    expect(qrUrl).toContain('data=')
  })

  it('应该处理长 URL', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000)

    const qrUrl = getQRCodeUrl(longUrl)

    expect(qrUrl).toContain('api.qrserver.com')
    expect(qrUrl.length).toBeGreaterThan(100)
  })
})

describe('formatShareText', () => {
  it('应该格式化基本的行程信息', () => {
    const trip = {
      destination: '北京',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toBe('我的 北京 旅行计划 (2024-05-01 至 2024-05-05)')
  })

  it('应该处理单天行程', () => {
    const trip = {
      destination: '上海',
      start_date: '2024-05-01',
      end_date: '2024-05-01',
    }

    const text = formatShareText(trip)

    expect(text).toBe('我的 上海 旅行计划 (2024-05-01 至 2024-05-01)')
  })

  it('应该处理带空格的目的地', () => {
    const trip = {
      destination: '纽约 曼哈顿',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toContain('纽约 曼哈顿')
  })

  it('应该处理英文目的地', () => {
    const trip = {
      destination: 'New York',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toBe('我的 New York 旅行计划 (2024-05-01 至 2024-05-05)')
  })

  it('应该处理特殊字符', () => {
    const trip = {
      destination: '东京/大阪',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toContain('东京/大阪')
  })

  it('应该包含所有关键信息', () => {
    const trip = {
      destination: '成都',
      start_date: '2024-03-15',
      end_date: '2024-03-20',
    }

    const text = formatShareText(trip)

    expect(text).toContain('成都')
    expect(text).toContain('2024-03-15')
    expect(text).toContain('2024-03-20')
    expect(text).toContain('旅行计划')
  })

  it('应该处理空字符串目的地', () => {
    const trip = {
      destination: '',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toBe('我的  旅行计划 (2024-05-01 至 2024-05-05)')
  })

  it('应该处理长目的地名称', () => {
    const trip = {
      destination: '新疆维吾尔自治区乌鲁木齐市天山区',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }

    const text = formatShareText(trip)

    expect(text).toContain('新疆维吾尔自治区乌鲁木齐市天山区')
  })
})

describe('边界情况综合测试', () => {
  it('完整的分享流程应该正常工作', () => {
    // 1. 生成 token
    const token = generateShareToken()
    expect(token).toBeTruthy()

    // 2. 生成分享 URL
    const shareUrl = getShareUrl(token, 'https://example.com')
    expect(shareUrl).toContain(token)

    // 3. 生成二维码
    const qrUrl = getQRCodeUrl(shareUrl)
    expect(qrUrl).toContain(encodeURIComponent(shareUrl))

    // 4. 格式化分享文本
    const text = formatShareText({
      destination: '北京',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    })
    expect(text).toContain('北京')
  })

  it('应该处理 Unicode 字符', () => {
    const emojiText = '🎉 旅行计划 🌏'

    const qrUrl = getQRCodeUrl(emojiText)
    expect(qrUrl).toContain(encodeURIComponent(emojiText))

    const trip = {
      destination: '东京 🗼',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
    }
    const shareText = formatShareText(trip)
    expect(shareText).toContain('东京 🗼')
  })
})
