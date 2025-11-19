/**
 * TripOverviewMap 组件测试
 *
 * 测试全行程总览地图组件的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TripOverviewMap from '@/components/TripOverviewMap'
import {
  setupAMapMock,
  cleanupAMapMock,
  mockAMapLoaderLoaded,
  mockAMapLoaderLoading,
  mockAMapLoaderError
} from '../mocks/amap'
import type { DayPlan, Accommodation } from '@/types'

// Mock useAMapLoader hook
const mockUseAMapLoader = vi.fn()
vi.mock('@/hooks/useAMapLoader', () => ({
  useAMapLoader: () => mockUseAMapLoader()
}))

// 测试数据
const createTestDays = (count: number = 2): DayPlan[] => {
  const days: DayPlan[] = []
  for (let i = 1; i <= count; i++) {
    days.push({
      day: i,
      date: `2024-01-${i.toString().padStart(2, '0')}`,
      theme: `第${i}天主题`,
      activities: [
        {
          name: `景点${i}-1`,
          time: '09:00',
          duration: '2小时',
          description: `第${i}天第1个景点`,
          type: 'attraction',
          location: {
            lat: 39.9 + i * 0.01,
            lng: 116.4 + i * 0.01,
            address: `地址${i}-1`
          }
        }
      ],
      meals: [],
      tips: []
    })
  }
  return days
}

const createTestAccommodation = (): Accommodation[] => [
  {
    name: '测试酒店',
    type: 'hotel',
    location: { lat: 39.92, lng: 116.42, address: '酒店地址' },
    price_range: '¥500-800',
    rating: 4.5,
    check_in_date: '2024-01-01',
    check_out_date: '2024-01-03',
    nights: 2
  }
]

describe('TripOverviewMap', () => {
  beforeEach(() => {
    setupAMapMock()
    mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoaded)
  })

  afterEach(() => {
    cleanupAMapMock()
    vi.clearAllMocks()
  })

  describe('加载状态', () => {
    it('应该在加载时显示加载指示器', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoading)
      render(<TripOverviewMap days={createTestDays()} />)
      expect(screen.getByText('加载地图中...')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('应该在加载错误时显示错误信息', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderError)
      render(<TripOverviewMap days={createTestDays()} />)
      expect(screen.getByText('地图加载失败')).toBeInTheDocument()
    })

    it('应该在没有位置信息时显示提示', async () => {
      const emptyDays: DayPlan[] = [{
        day: 1,
        date: '2024-01-01',
        theme: '空行程',
        activities: [],
        meals: [],
        tips: []
      }]
      render(<TripOverviewMap days={emptyDays} />)
      await waitFor(() => {
        expect(screen.getByText('当前行程无位置信息')).toBeInTheDocument()
      })
    })
  })

  describe('地图初始化', () => {
    it('应该成功渲染地图容器', () => {
      const { container } = render(<TripOverviewMap days={createTestDays()} />)
      const mapContainer = container.querySelector('.h-\\[600px\\]')
      expect(mapContainer).toBeInTheDocument()
    })

    it('应该传递自定义 className', () => {
      const { container } = render(
        <TripOverviewMap days={createTestDays()} className="custom-class" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('工具栏', () => {
    it('应该显示天数按钮', async () => {
      render(<TripOverviewMap days={createTestDays(2)} />)
      await waitFor(() => {
        expect(screen.getByText('Day 1')).toBeInTheDocument()
        expect(screen.getByText('Day 2')).toBeInTheDocument()
      })
    })

    it('应该在有住宿时显示住宿按钮', async () => {
      render(
        <TripOverviewMap
          days={createTestDays()}
          accommodation={createTestAccommodation()}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('住宿')).toBeInTheDocument()
      })
    })
  })

  describe('天数切换', () => {
    it('应该能切换到不同天数', async () => {
      render(<TripOverviewMap days={createTestDays(2)} />)
      await waitFor(() => {
        expect(screen.getByText('Day 2')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Day 2'))
    })

    it('应该能切换到住宿视图', async () => {
      render(
        <TripOverviewMap
          days={createTestDays()}
          accommodation={createTestAccommodation()}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('住宿')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('住宿'))
    })
  })

  describe('酒店标记', () => {
    it('应该接受酒店点击回调', async () => {
      const onHotelClick = vi.fn()
      render(
        <TripOverviewMap
          days={createTestDays()}
          accommodation={createTestAccommodation()}
          onHotelClick={onHotelClick}
        />
      )
      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })
  })

  describe('样式和布局', () => {
    it('应该有正确的边框样式', () => {
      const { container } = render(<TripOverviewMap days={createTestDays()} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('rounded-lg')
      expect(wrapper).toHaveClass('border')
    })
  })
})
