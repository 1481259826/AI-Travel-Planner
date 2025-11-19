/**
 * TripMapToolbar 组件测试
 * 测试天数切换、路线控制、视图折叠等功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripMapToolbar from '@/components/map/TripMapToolbar'
import { DayPlan, Accommodation } from '@/types'

// Mock lucide-react 图标
vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="map-pin-icon" />,
  Navigation: () => <span data-testid="navigation-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  ChevronUp: () => <span data-testid="chevron-up-icon" />
}))

describe('TripMapToolbar', () => {
  // 测试数据
  const mockDays: DayPlan[] = [
    {
      day: 1,
      date: '2024-01-01',
      activities: [],
      meals: []
    },
    {
      day: 2,
      date: '2024-01-02',
      activities: [],
      meals: []
    },
    {
      day: 3,
      date: '2024-01-03',
      activities: [],
      meals: []
    }
  ]

  const mockAccommodation: Accommodation[] = [
    {
      name: '测试酒店',
      type: 'hotel',
      check_in: '2024-01-01',
      check_out: '2024-01-03',
      price_per_night: 500,
      total_price: 1000,
      location: {
        name: '测试位置',
        address: '测试地址',
        lat: 31.2304,
        lng: 121.4737
      }
    }
  ]

  const mockRouteLines = [
    { dayNumber: 1, color: '#3B82F6' },
    { dayNumber: 2, color: '#10B981' },
    { dayNumber: 3, color: '#F59E0B' }
  ]

  const defaultProps = {
    days: mockDays,
    accommodation: mockAccommodation,
    selectedDay: 1 as number | 'accommodation',
    showRoutes: false,
    routeLines: mockRouteLines,
    toolbarCollapsed: false,
    onDayChange: vi.fn(),
    onAccommodationClick: vi.fn(),
    onToggleRoutes: vi.fn(),
    onToggleCollapse: vi.fn()
  }

  describe('展开状态渲染', () => {
    it('应该渲染标题和图标', () => {
      render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByText('景点地图')).toBeInTheDocument()
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument()
    })

    it('应该渲染所有天数按钮', () => {
      render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByRole('button', { name: '第1天' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '第2天' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '第3天' })).toBeInTheDocument()
    })

    it('应该渲染住宿按钮（当有住宿数据时）', () => {
      render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /住宿/ })).toBeInTheDocument()
    })

    it('没有住宿数据时不应该渲染住宿按钮', () => {
      render(<TripMapToolbar {...defaultProps} accommodation={[]} />)

      expect(screen.queryByRole('button', { name: /住宿/ })).not.toBeInTheDocument()
    })

    it('应该渲染收起按钮', () => {
      render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByTitle('收起工具栏')).toBeInTheDocument()
    })

    it('有路线数据时应该渲染路线切换按钮', () => {
      render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /显示路线/ })).toBeInTheDocument()
    })

    it('没有路线数据时不应该渲染路线切换按钮', () => {
      render(<TripMapToolbar {...defaultProps} routeLines={[]} />)

      expect(screen.queryByRole('button', { name: /路线/ })).not.toBeInTheDocument()
    })
  })

  describe('收起状态渲染', () => {
    it('收起状态应该显示紧凑视图', () => {
      render(<TripMapToolbar {...defaultProps} toolbarCollapsed={true} />)

      // 应该显示景点地图标题
      expect(screen.getByText('景点地图')).toBeInTheDocument()
      // 应该显示当前选中的天数
      expect(screen.getByText('第1天')).toBeInTheDocument()
      // 应该显示展开按钮
      expect(screen.getByTitle('展开工具栏')).toBeInTheDocument()
    })

    it('收起状态选中住宿时应该显示住宿标签', () => {
      render(
        <TripMapToolbar
          {...defaultProps}
          toolbarCollapsed={true}
          selectedDay="accommodation"
        />
      )

      expect(screen.getByText(/住宿/)).toBeInTheDocument()
    })

    it('收起状态不应该显示天数切换按钮', () => {
      render(<TripMapToolbar {...defaultProps} toolbarCollapsed={true} />)

      // 不应该有多个天数按钮
      expect(screen.queryByRole('button', { name: '第2天' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '第3天' })).not.toBeInTheDocument()
    })
  })

  describe('天数切换功能', () => {
    it('点击天数按钮应该调用 onDayChange', () => {
      const onDayChange = vi.fn()
      render(<TripMapToolbar {...defaultProps} onDayChange={onDayChange} />)

      fireEvent.click(screen.getByRole('button', { name: '第2天' }))

      expect(onDayChange).toHaveBeenCalledWith(2)
    })

    it('点击不同天数按钮应该调用相应的 day 参数', () => {
      const onDayChange = vi.fn()
      render(<TripMapToolbar {...defaultProps} onDayChange={onDayChange} />)

      fireEvent.click(screen.getByRole('button', { name: '第1天' }))
      expect(onDayChange).toHaveBeenCalledWith(1)

      fireEvent.click(screen.getByRole('button', { name: '第3天' }))
      expect(onDayChange).toHaveBeenCalledWith(3)
    })

    it('选中的天数按钮应该有不同的样式', () => {
      render(<TripMapToolbar {...defaultProps} selectedDay={2} />)

      const day2Button = screen.getByRole('button', { name: '第2天' })
      // 选中状态应该有 text-white 和 shadow-md
      expect(day2Button).toHaveClass('text-white')
      expect(day2Button).toHaveClass('shadow-md')
    })
  })

  describe('住宿按钮功能', () => {
    it('点击住宿按钮应该调用 onAccommodationClick', () => {
      const onAccommodationClick = vi.fn()
      render(
        <TripMapToolbar
          {...defaultProps}
          onAccommodationClick={onAccommodationClick}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /住宿/ }))

      expect(onAccommodationClick).toHaveBeenCalledTimes(1)
    })

    it('选中住宿时按钮应该有不同的样式', () => {
      render(<TripMapToolbar {...defaultProps} selectedDay="accommodation" />)

      const accommodationButton = screen.getByRole('button', { name: /住宿/ })
      expect(accommodationButton).toHaveClass('text-white')
      expect(accommodationButton).toHaveClass('shadow-md')
    })
  })

  describe('路线切换功能', () => {
    it('点击路线按钮应该调用 onToggleRoutes', () => {
      const onToggleRoutes = vi.fn()
      render(<TripMapToolbar {...defaultProps} onToggleRoutes={onToggleRoutes} />)

      fireEvent.click(screen.getByRole('button', { name: /显示路线/ }))

      expect(onToggleRoutes).toHaveBeenCalledTimes(1)
    })

    it('showRoutes 为 true 时按钮文字应该是"隐藏路线"', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={true} />)

      expect(screen.getByRole('button', { name: /隐藏路线/ })).toBeInTheDocument()
    })

    it('showRoutes 为 false 时按钮文字应该是"显示路线"', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={false} />)

      expect(screen.getByRole('button', { name: /显示路线/ })).toBeInTheDocument()
    })

    it('showRoutes 为 true 时应该显示路线图例', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={true} />)

      // 应该显示每天的路线图例（文本在按钮和图例中都存在，使用 getAllByText）
      // 检查路线图例容器存在
      const legendContainer = document.querySelector('.mt-3.pt-3.border-t')
      expect(legendContainer).toBeInTheDocument()

      // 每天的文本应该出现两次（一次在按钮，一次在图例）
      expect(screen.getAllByText('第1天')).toHaveLength(2)
      expect(screen.getAllByText('第2天')).toHaveLength(2)
      expect(screen.getAllByText('第3天')).toHaveLength(2)
    })

    it('showRoutes 为 false 时不应该显示路线图例', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={false} />)

      // 图例文字不应该在路线图例区域显示（但天数按钮中仍有这些文字）
      // 所以我们检查图例容器不存在
      const legendContainer = screen.queryByText('第1天')?.closest('.mt-3.pt-3.border-t')
      expect(legendContainer).toBeNull()
    })
  })

  describe('折叠/展开功能', () => {
    it('点击收起按钮应该调用 onToggleCollapse(true)', () => {
      const onToggleCollapse = vi.fn()
      render(
        <TripMapToolbar {...defaultProps} onToggleCollapse={onToggleCollapse} />
      )

      fireEvent.click(screen.getByTitle('收起工具栏'))

      expect(onToggleCollapse).toHaveBeenCalledWith(true)
    })

    it('收起状态点击展开按钮应该调用 onToggleCollapse(false)', () => {
      const onToggleCollapse = vi.fn()
      render(
        <TripMapToolbar
          {...defaultProps}
          toolbarCollapsed={true}
          onToggleCollapse={onToggleCollapse}
        />
      )

      fireEvent.click(screen.getByTitle('展开工具栏'))

      expect(onToggleCollapse).toHaveBeenCalledWith(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理空的 days 数组', () => {
      render(<TripMapToolbar {...defaultProps} days={[]} />)

      // 不应该崩溃，应该正常渲染标题
      expect(screen.getByText('景点地图')).toBeInTheDocument()
    })

    it('应该处理单天行程', () => {
      render(<TripMapToolbar {...defaultProps} days={[mockDays[0]]} />)

      expect(screen.getByRole('button', { name: '第1天' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '第2天' })).not.toBeInTheDocument()
    })

    it('应该处理大量天数', () => {
      const manyDays = Array.from({ length: 10 }, (_, i) => ({
        day: i + 1,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        activities: [],
        meals: []
      }))

      render(<TripMapToolbar {...defaultProps} days={manyDays} />)

      // 应该渲染所有天数按钮
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByRole('button', { name: `第${i}天` })).toBeInTheDocument()
      }
    })
  })

  describe('样式和颜色', () => {
    it('选中的天数按钮应该应用对应的颜色', () => {
      render(<TripMapToolbar {...defaultProps} selectedDay={1} />)

      const day1Button = screen.getByRole('button', { name: '第1天' })
      // 选中状态应该有内联 backgroundColor 样式
      expect(day1Button).toHaveStyle({ backgroundColor: expect.any(String) })
    })

    it('路线切换按钮在激活状态应该有蓝色背景', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={true} />)

      const routeButton = screen.getByRole('button', { name: /隐藏路线/ })
      expect(routeButton).toHaveClass('bg-blue-600')
      expect(routeButton).toHaveClass('text-white')
    })

    it('路线切换按钮在非激活状态应该有灰色背景', () => {
      render(<TripMapToolbar {...defaultProps} showRoutes={false} />)

      const routeButton = screen.getByRole('button', { name: /显示路线/ })
      expect(routeButton).toHaveClass('bg-gray-100')
    })
  })

  describe('可访问性', () => {
    it('收起/展开按钮应该有正确的 title 属性', () => {
      const { rerender } = render(<TripMapToolbar {...defaultProps} />)

      expect(screen.getByTitle('收起工具栏')).toBeInTheDocument()

      rerender(<TripMapToolbar {...defaultProps} toolbarCollapsed={true} />)

      expect(screen.getByTitle('展开工具栏')).toBeInTheDocument()
    })

    it('所有按钮应该是可点击的', () => {
      render(<TripMapToolbar {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toBeDisabled()
      })
    })
  })
})
