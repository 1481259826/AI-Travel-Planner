/**
 * MapLegend 组件测试
 * 测试地图图例显示、路线说明切换等功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MapLegend from '@/components/map/MapLegend'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MapPin: ({ className, ...props }: any) => (
    <svg className={className} data-testid="map-pin-icon" {...props}>
      <path d="map-pin-path" />
    </svg>
  )
}))

describe('MapLegend', () => {
  describe('基本渲染', () => {
    it('应该渲染图例组件', () => {
      const { container } = render(<MapLegend />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该显示图例标题', () => {
      render(<MapLegend />)
      expect(screen.getByText('图例')).toBeInTheDocument()
    })

    it('应该显示地图图钉图标', () => {
      render(<MapLegend />)
      const icon = screen.getByTestId('map-pin-icon')
      expect(icon).toBeInTheDocument()
    })

    it('应该有正确的样式类', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement
      expect(legend).toHaveClass('absolute', 'bottom-4', 'left-4', 'bg-white', 'rounded-lg', 'shadow-lg')
    })
  })

  describe('图例项显示', () => {
    it('应该显示活动景点图例', () => {
      render(<MapLegend />)
      expect(screen.getByText('活动景点')).toBeInTheDocument()
      expect(screen.getByText('🎯')).toBeInTheDocument()
    })

    it('应该显示餐饮推荐图例', () => {
      render(<MapLegend />)
      expect(screen.getByText('餐饮推荐')).toBeInTheDocument()
      expect(screen.getByText('🍽️')).toBeInTheDocument()
    })

    it('应该显示推荐住宿图例', () => {
      render(<MapLegend />)
      expect(screen.getByText('推荐住宿')).toBeInTheDocument()
      expect(screen.getByText('🏨')).toBeInTheDocument()
    })

    it('应该显示所有三个图例项', () => {
      render(<MapLegend />)
      const legendItems = [
        { emoji: '🎯', text: '活动景点' },
        { emoji: '🍽️', text: '餐饮推荐' },
        { emoji: '🏨', text: '推荐住宿' }
      ]

      legendItems.forEach(item => {
        expect(screen.getByText(item.emoji)).toBeInTheDocument()
        expect(screen.getByText(item.text)).toBeInTheDocument()
      })
    })

    it('图例项应该有正确的顺序', () => {
      const { container } = render(<MapLegend />)
      const legendTexts = container.querySelectorAll('.text-gray-700')

      expect(legendTexts[0]).toHaveTextContent('活动景点')
      expect(legendTexts[1]).toHaveTextContent('餐饮推荐')
      expect(legendTexts[2]).toHaveTextContent('推荐住宿')
    })
  })

  describe('路线说明', () => {
    it('默认不显示路线说明', () => {
      render(<MapLegend />)
      expect(screen.queryByText(/蓝色线路/)).not.toBeInTheDocument()
    })

    it('showRoute=false 时不显示路线说明', () => {
      render(<MapLegend showRoute={false} />)
      expect(screen.queryByText(/蓝色线路/)).not.toBeInTheDocument()
    })

    it('showRoute=true 时显示路线说明', () => {
      render(<MapLegend showRoute={true} />)
      expect(screen.getByText('蓝色线路为推荐路线')).toBeInTheDocument()
    })

    it('路线说明应该有正确的样式', () => {
      const { container } = render(<MapLegend showRoute={true} />)
      const routeText = screen.getByText('蓝色线路为推荐路线')

      // 检查路线说明文本的样式
      expect(routeText).toHaveClass('text-xs', 'text-gray-500')

      // 检查路线说明容器的样式（通过 DOM 查找）
      const routeContainer = container.querySelector('.mt-2.pt-2.border-t')
      expect(routeContainer).toBeInTheDocument()
      expect(routeContainer).toContainElement(routeText)
    })
  })

  describe('布局和样式', () => {
    it('应该使用固定定位在左下角', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement

      expect(legend).toHaveClass('absolute')
      expect(legend).toHaveClass('bottom-4')
      expect(legend).toHaveClass('left-4')
    })

    it('应该有白色背景和阴影', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement

      expect(legend).toHaveClass('bg-white')
      expect(legend).toHaveClass('shadow-lg')
      expect(legend).toHaveClass('rounded-lg')
    })

    it('应该有正确的 z-index', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement

      expect(legend).toHaveClass('z-10')
    })

    it('应该有适当的内边距', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement

      expect(legend).toHaveClass('p-3')
    })

    it('应该有小号文本', () => {
      const { container } = render(<MapLegend />)
      const legend = container.firstChild as HTMLElement

      expect(legend).toHaveClass('text-sm')
    })
  })

  describe('图标样式', () => {
    it('MapPin 图标应该有正确的大小', () => {
      render(<MapLegend />)
      const icon = screen.getByTestId('map-pin-icon')

      expect(icon).toHaveClass('w-4', 'h-4')
    })

    it('MapPin 图标应该是蓝色', () => {
      render(<MapLegend />)
      const icon = screen.getByTestId('map-pin-icon')

      expect(icon).toHaveClass('text-blue-600')
    })

    it('emoji 应该有大号文本', () => {
      const { container } = render(<MapLegend />)
      const emojis = container.querySelectorAll('.text-lg')

      // 应该有3个 emoji（活动、餐饮、住宿）
      expect(emojis.length).toBe(3)
    })
  })

  describe('边界情况', () => {
    it('应该处理 showRoute 为 undefined', () => {
      const { container } = render(<MapLegend showRoute={undefined} />)
      expect(container.firstChild).toBeInTheDocument()
      expect(screen.queryByText(/蓝色线路/)).not.toBeInTheDocument()
    })

    it('组件应该是独立的（无外部依赖）', () => {
      const { container, rerender } = render(<MapLegend />)

      expect(container.firstChild).toBeInTheDocument()

      // 重新渲染应该不影响显示
      rerender(<MapLegend showRoute={true} />)
      expect(screen.getByText('蓝色线路为推荐路线')).toBeInTheDocument()

      rerender(<MapLegend showRoute={false} />)
      expect(screen.queryByText(/蓝色线路/)).not.toBeInTheDocument()
    })
  })

  describe('可访问性', () => {
    it('图例标题应该使用语义化标签', () => {
      render(<MapLegend />)
      const title = screen.getByText('图例')

      expect(title).toHaveClass('font-semibold')
    })

    it('图例项文本应该有适当的颜色对比', () => {
      const { container } = render(<MapLegend />)
      const legendTexts = container.querySelectorAll('.text-gray-700')

      // 所有图例项都应该使用 gray-700（良好对比度）
      expect(legendTexts).toHaveLength(3)
    })

    it('路线说明应该有适当的颜色对比', () => {
      render(<MapLegend showRoute={true} />)
      const routeText = screen.getByText('蓝色线路为推荐路线')

      // 使用 gray-500（次要信息，但仍然可读）
      expect(routeText).toHaveClass('text-gray-500')
    })
  })
})
