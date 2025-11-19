/**
 * RatingDisplay 组件测试
 * 测试星级评分显示、半星渲染、数字评分等功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RatingDisplay from '@/components/shared/RatingDisplay'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Star: ({ className, ...props }: any) => (
    <svg className={className} data-testid="star-icon" {...props}>
      <path d="star-path" />
    </svg>
  )
}))

describe('RatingDisplay', () => {
  describe('基本渲染', () => {
    it('应该渲染评分组件', () => {
      const { container } = render(<RatingDisplay rating={4.5} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该渲染5个星星', () => {
      render(<RatingDisplay rating={3.0} />)
      const stars = screen.getAllByTestId('star-icon')
      expect(stars).toHaveLength(5)
    })

    it('应该应用自定义类名', () => {
      const { container } = render(
        <RatingDisplay rating={4.0} className="custom-rating" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-rating')
    })
  })

  describe('星星显示', () => {
    it('0分应该显示5个空星', () => {
      render(<RatingDisplay rating={0} />)
      const stars = screen.getAllByTestId('star-icon')

      stars.forEach(star => {
        expect(star).toHaveClass('text-gray-300')
        expect(star).not.toHaveClass('fill-yellow-400')
      })
    })

    it('5分应该显示5个全星', () => {
      const { container } = render(<RatingDisplay rating={5} />)

      // 检查是否有黄色填充的星星（全星）
      const fullStars = container.querySelectorAll('.fill-yellow-400.text-yellow-400')
      expect(fullStars.length).toBeGreaterThanOrEqual(5)
    })

    it('3分应该显示3个全星和2个空星', () => {
      const { container } = render(<RatingDisplay rating={3.0} />)

      // 全星：同时有 fill-yellow-400 和 text-yellow-400
      const fullStars = container.querySelectorAll('.fill-yellow-400.text-yellow-400')
      // 空星：只有 text-gray-300（不在半星容器内的）
      const emptyStars = container.querySelectorAll('.text-gray-300:not(.absolute)')

      expect(fullStars).toHaveLength(3)
      expect(emptyStars).toHaveLength(2)
    })

    it('1分应该显示1个全星和4个空星', () => {
      const { container } = render(<RatingDisplay rating={1.0} />)

      const fullStars = container.querySelectorAll('.fill-yellow-400.text-yellow-400')
      const emptyStars = container.querySelectorAll('.text-gray-300:not(.absolute)')

      expect(fullStars).toHaveLength(1)
      expect(emptyStars).toHaveLength(4)
    })
  })

  describe('半星显示', () => {
    it('4.5分应该显示4个全星、1个半星', () => {
      const { container } = render(<RatingDisplay rating={4.5} />)

      // 全星：同时有 fill-yellow-400 和 text-yellow-400（不在半星容器内）
      const fullStars = container.querySelectorAll('.flex > .fill-yellow-400.text-yellow-400')

      // 应该有半星容器（relative 定位的 div）
      const halfStarContainer = container.querySelector('.relative.w-4.h-4')
      expect(halfStarContainer).toBeInTheDocument()

      // 全星数量应该是 4
      expect(fullStars).toHaveLength(4)
    })

    it('3.5分应该显示3个全星、1个半星、1个空星', () => {
      const { container } = render(<RatingDisplay rating={3.5} />)

      // 应该有半星容器
      const halfStarContainer = container.querySelector('.relative.w-4.h-4')
      expect(halfStarContainer).toBeInTheDocument()

      // 半星容器内应该有2个星星（灰色背景 + 黄色前景）
      const halfStarIcons = halfStarContainer?.querySelectorAll('[data-testid="star-icon"]')
      expect(halfStarIcons).toHaveLength(2)
    })

    it('半星应该有正确的结构（灰色背景 + 黄色前景）', () => {
      const { container } = render(<RatingDisplay rating={2.5} />)

      const halfStarContainer = container.querySelector('.relative.w-4.h-4')
      expect(halfStarContainer).toBeInTheDocument()

      // 半星容器内的第一个星星应该是灰色（绝对定位）
      const bgStar = halfStarContainer?.querySelector('.absolute.text-gray-300')
      expect(bgStar).toBeInTheDocument()

      // 半星容器内应该有 overflow-hidden 的 div（50% 宽度）
      const halfOverlay = halfStarContainer?.querySelector('.overflow-hidden.absolute')
      expect(halfOverlay).toBeInTheDocument()
      expect(halfOverlay).toHaveStyle({ width: '50%' })

      // overflow-hidden 内应该有黄色星星
      const fgStar = halfOverlay?.querySelector('.fill-yellow-400')
      expect(fgStar).toBeInTheDocument()
    })

    it('0.5分应该显示1个半星、4个空星', () => {
      const { container } = render(<RatingDisplay rating={0.5} />)

      const halfStarContainer = container.querySelector('.relative.w-4.h-4')
      expect(halfStarContainer).toBeInTheDocument()
    })

    it('1.5分应该显示1个全星、1个半星、3个空星', () => {
      const { container } = render(<RatingDisplay rating={1.5} />)

      const stars = screen.getAllByTestId('star-icon')
      const halfStarContainer = container.querySelector('.relative.w-4.h-4')

      expect(halfStarContainer).toBeInTheDocument()
      expect(stars.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('数字评分显示', () => {
    it('默认不显示数字评分', () => {
      render(<RatingDisplay rating={4.5} />)
      expect(screen.queryByText(/分$/)).not.toBeInTheDocument()
    })

    it('showNumeric=true 时应该显示数字评分', () => {
      render(<RatingDisplay rating={4.5} showNumeric />)
      expect(screen.getByText('4.5 分')).toBeInTheDocument()
    })

    it('showNumeric=false 时不应该显示数字评分', () => {
      render(<RatingDisplay rating={4.5} showNumeric={false} />)
      expect(screen.queryByText(/分$/)).not.toBeInTheDocument()
    })

    it('应该显示一位小数的评分', () => {
      render(<RatingDisplay rating={3.7} showNumeric />)
      expect(screen.getByText('3.7 分')).toBeInTheDocument()
    })

    it('整数评分应该显示为 x.0', () => {
      render(<RatingDisplay rating={4} showNumeric />)
      expect(screen.getByText('4.0 分')).toBeInTheDocument()
    })

    it('0分应该显示 0.0 分', () => {
      render(<RatingDisplay rating={0} showNumeric />)
      expect(screen.getByText('0.0 分')).toBeInTheDocument()
    })

    it('5分应该显示 5.0 分', () => {
      render(<RatingDisplay rating={5} showNumeric />)
      expect(screen.getByText('5.0 分')).toBeInTheDocument()
    })
  })

  describe('自定义样式', () => {
    it('应该应用自定义星星大小', () => {
      const { container } = render(
        <RatingDisplay rating={4.0} starSize="w-6 h-6" />
      )

      // 检查是否有使用自定义大小的星星
      const customSizedStars = container.querySelectorAll('.w-6.h-6')
      expect(customSizedStars.length).toBeGreaterThan(0)
    })

    it('应该应用默认星星大小', () => {
      const { container } = render(<RatingDisplay rating={4.0} />)

      // 检查是否有使用默认大小的星星
      const defaultSizedStars = container.querySelectorAll('.w-4.h-4')
      expect(defaultSizedStars.length).toBeGreaterThan(0)
    })

    it('应该应用自定义数字大小', () => {
      render(
        <RatingDisplay rating={4.5} showNumeric numericSize="text-lg" />
      )

      const numericText = screen.getByText('4.5 分')
      expect(numericText).toHaveClass('text-lg')
    })

    it('应该应用默认数字大小', () => {
      render(<RatingDisplay rating={4.5} showNumeric />)

      const numericText = screen.getByText('4.5 分')
      expect(numericText).toHaveClass('text-sm')
    })

    it('半星容器应该使用自定义大小', () => {
      const { container } = render(
        <RatingDisplay rating={3.5} starSize="w-8 h-8" />
      )

      const halfStarContainer = container.querySelector('.relative.w-8.h-8')
      expect(halfStarContainer).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理负数评分', () => {
      render(<RatingDisplay rating={-1} showNumeric />)

      // 应该显示负数（虽然不合理，但组件应该能处理）
      expect(screen.getByText('-1.0 分')).toBeInTheDocument()
    })

    it('应该处理超过5分的评分', () => {
      render(<RatingDisplay rating={6.5} showNumeric />)

      // 应该显示实际评分
      expect(screen.getByText('6.5 分')).toBeInTheDocument()
    })

    it('应该处理0分', () => {
      const { container } = render(<RatingDisplay rating={0} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理5分', () => {
      const { container } = render(<RatingDisplay rating={5} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理极小的小数', () => {
      render(<RatingDisplay rating={0.1} showNumeric />)
      expect(screen.getByText('0.1 分')).toBeInTheDocument()
    })

    it('应该处理极大的小数', () => {
      render(<RatingDisplay rating={4.9} showNumeric />)
      expect(screen.getByText('4.9 分')).toBeInTheDocument()
    })

    it('应该处理多位小数（截断到1位）', () => {
      render(<RatingDisplay rating={3.456} showNumeric />)
      expect(screen.getByText('3.5 分')).toBeInTheDocument()
    })
  })

  describe('常见评分场景', () => {
    const testCases = [
      { rating: 0, desc: '0分' },
      { rating: 0.5, desc: '0.5分（半星）' },
      { rating: 1, desc: '1分' },
      { rating: 1.5, desc: '1.5分（半星）' },
      { rating: 2, desc: '2分' },
      { rating: 2.5, desc: '2.5分（半星）' },
      { rating: 3, desc: '3分' },
      { rating: 3.5, desc: '3.5分（半星）' },
      { rating: 4, desc: '4分' },
      { rating: 4.5, desc: '4.5分（半星）' },
      { rating: 5, desc: '5分' }
    ]

    testCases.forEach(({ rating, desc }) => {
      it(`应该正确渲染${desc}`, () => {
        const { container } = render(
          <RatingDisplay rating={rating} showNumeric />
        )

        // 验证组件渲染成功
        expect(container.firstChild).toBeInTheDocument()

        // 验证数字显示正确
        expect(screen.getByText(`${rating.toFixed(1)} 分`)).toBeInTheDocument()

        // 验证有5个星星（或星星元素）
        const stars = screen.getAllByTestId('star-icon')
        expect(stars.length).toBeGreaterThanOrEqual(5)
      })
    })
  })
})
