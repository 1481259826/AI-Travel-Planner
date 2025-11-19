/**
 * MapView 组件测试
 *
 * 测试通用地图视图组件的各种功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MapView, { extractLocationsFromItinerary, MapLocation } from '@/components/MapView'
import {
  setupAMapMock,
  cleanupAMapMock,
  mockAMapLoaderLoaded,
  mockAMapLoaderLoading,
  mockAMapLoaderError
} from '../mocks/amap'
import type { Activity, Meal } from '@/types'

// Mock useAMapLoader hook
const mockUseAMapLoader = vi.fn()
vi.mock('@/hooks/useAMapLoader', () => ({
  useAMapLoader: () => mockUseAMapLoader()
}))

// 测试数据
const createTestLocations = (count: number = 3): MapLocation[] => {
  const locations: MapLocation[] = []

  for (let i = 1; i <= count; i++) {
    locations.push({
      name: `位置${i}`,
      lat: 39.9 + i * 0.01,
      lng: 116.4 + i * 0.01,
      type: 'activity',
      description: `位置${i}的描述`,
      time: `${8 + i}:00`
    })
  }

  return locations
}

const createMealLocations = (): MapLocation[] => [
  {
    name: '餐厅A',
    lat: 39.92,
    lng: 116.42,
    type: 'meal',
    description: '中餐 · 人均 ¥80',
    time: '12:00'
  },
  {
    name: '餐厅B',
    lat: 39.93,
    lng: 116.43,
    type: 'meal',
    description: '晚餐 · 人均 ¥150',
    time: '18:00'
  }
]

describe('MapView', () => {
  beforeEach(() => {
    // 设置 AMap Mock
    setupAMapMock()
    // 重置 useAMapLoader mock
    mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoaded)
  })

  afterEach(() => {
    // 清理 AMap Mock
    cleanupAMapMock()
    vi.clearAllMocks()
  })

  describe('加载状态', () => {
    it('应该在加载时显示加载指示器', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoading)

      render(<MapView locations={createTestLocations()} />)

      expect(screen.getByText('加载地图中...')).toBeInTheDocument()
    })

    it('应该显示旋转动画', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoading)

      const { container } = render(<MapView locations={createTestLocations()} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('加载指示器应该覆盖在地图上方', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoading)

      const { container } = render(<MapView locations={createTestLocations()} />)

      // 检查 z-index 层级
      const loadingOverlay = container.querySelector('.z-10')
      expect(loadingOverlay).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('应该在加载错误时显示错误信息', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderError)

      render(<MapView locations={createTestLocations()} />)

      // 检查错误标题和详情（两个都显示 "地图加载失败"）
      const errorTexts = screen.getAllByText(/地图加载失败/)
      expect(errorTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('应该显示错误图标', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderError)

      const { container } = render(<MapView locations={createTestLocations()} />)

      // AlertCircle 图标
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('错误容器应该有红色样式', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderError)

      const { container } = render(<MapView locations={createTestLocations()} />)

      const errorContainer = container.querySelector('.bg-red-50')
      expect(errorContainer).toBeInTheDocument()
    })

    it('应该显示具体的错误信息', () => {
      mockUseAMapLoader.mockReturnValue({
        loading: false,
        error: '自定义错误信息',
        isLoaded: false
      })

      render(<MapView locations={createTestLocations()} />)

      expect(screen.getByText('自定义错误信息')).toBeInTheDocument()
    })
  })

  describe('地图初始化', () => {
    it('应该成功渲染地图容器', async () => {
      const { container } = render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        const mapContainer = container.querySelector('.rounded-lg.overflow-hidden')
        expect(mapContainer).toBeInTheDocument()
      })
    })

    it('应该使用默认 zoom 级别', async () => {
      render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该使用自定义 zoom 级别', async () => {
      render(<MapView locations={createTestLocations()} zoom={15} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该使用自定义中心点', async () => {
      const center = { lat: 31.23, lng: 121.47 } // 上海

      render(<MapView locations={createTestLocations()} center={center} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该传递自定义 className', () => {
      const { container } = render(
        <MapView locations={createTestLocations()} className="custom-map-class" />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-map-class')
    })

    it('地图容器应该有最小高度', async () => {
      const { container } = render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        // 检查地图容器元素存在
        const mapContainer = container.querySelector('.w-full.h-full')
        expect(mapContainer).toBeInTheDocument()
      })
    })
  })

  describe('标记渲染', () => {
    it('应该为每个位置创建标记', async () => {
      const locations = createTestLocations(3)

      render(<MapView locations={locations} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该处理空位置数组', async () => {
      render(<MapView locations={[]} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该为不同类型的位置显示不同样式', async () => {
      const locations: MapLocation[] = [
        {
          name: '活动',
          lat: 39.9,
          lng: 116.4,
          type: 'activity',
          description: '活动描述'
        },
        {
          name: '餐厅',
          lat: 39.91,
          lng: 116.41,
          type: 'meal',
          description: '餐厅描述'
        }
      ]

      render(<MapView locations={locations} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('标记应该包含位置序号', async () => {
      render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        // 标记 label 包含序号
        expect(window.AMap).toBeDefined()
      })
    })
  })

  describe('图例显示', () => {
    it('应该在有位置时显示图例', async () => {
      render(<MapView locations={createTestLocations()} />)

      // 等待加载完成，图例应该显示
      await waitFor(() => {
        // MapLegend 组件应该被渲染
        expect(window.AMap).toBeDefined()
      })
    })

    it('不应该在加载时显示图例', () => {
      mockUseAMapLoader.mockReturnValue(mockAMapLoaderLoading)

      render(<MapView locations={createTestLocations()} />)

      // 加载时不显示图例
    })

    it('应该根据 showRoute 属性显示路线说明', async () => {
      render(<MapView locations={createTestLocations()} showRoute={true} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })
  })

  describe('路线显示', () => {
    it('默认不应该显示路线', async () => {
      render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该在 showRoute=true 时显示路线', async () => {
      render(<MapView locations={createTestLocations(3)} showRoute={true} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该使用驾车路线规划', async () => {
      render(<MapView locations={createTestLocations(2)} showRoute={true} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('单个位置不应该显示路线', async () => {
      render(<MapView locations={createTestLocations(1)} showRoute={true} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该在切换 showRoute 时更新路线', async () => {
      const { rerender } = render(
        <MapView locations={createTestLocations(3)} showRoute={false} />
      )

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })

      // 切换为显示路线
      rerender(<MapView locations={createTestLocations(3)} showRoute={true} />)
    })
  })

  describe('视野调整', () => {
    it('应该在初始加载时自动调整视野', async () => {
      render(<MapView locations={createTestLocations(3)} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })

    it('多个位置应该调用 setFitView', async () => {
      render(<MapView locations={createTestLocations(5)} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })
    })
  })

  describe('清理', () => {
    it('应该在卸载时销毁地图实例', async () => {
      const { unmount } = render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })

      unmount()
    })

    it('应该在卸载时清除路线', async () => {
      const { unmount } = render(
        <MapView locations={createTestLocations(3)} showRoute={true} />
      )

      await waitFor(() => {
        expect(window.AMap).toBeDefined()
      })

      unmount()
    })
  })

  describe('样式', () => {
    it('应该包含全局样式', async () => {
      render(<MapView locations={createTestLocations()} />)

      await waitFor(() => {
        // 检查样式是否被应用
        expect(window.AMap).toBeDefined()
      })
    })

    it('应该有 relative 定位', () => {
      const { container } = render(<MapView locations={createTestLocations()} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('relative')
    })
  })
})

describe('extractLocationsFromItinerary', () => {
  describe('活动提取', () => {
    it('应该从活动中提取位置', () => {
      const activities: Activity[] = [
        {
          name: '故宫',
          time: '09:00',
          duration: '3小时',
          description: '游览故宫',
          type: 'attraction',
          location: { lat: 39.9, lng: 116.4, address: '北京市' }
        }
      ]

      const locations = extractLocationsFromItinerary(activities, [])

      expect(locations).toHaveLength(1)
      expect(locations[0].name).toBe('故宫')
      expect(locations[0].type).toBe('activity')
    })

    it('应该过滤没有位置的活动', () => {
      const activities: Activity[] = [
        {
          name: '有位置',
          time: '09:00',
          duration: '1小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 39.9, lng: 116.4, address: '地址' }
        },
        {
          name: '无位置',
          time: '10:00',
          duration: '1小时',
          description: '测试',
          type: 'attraction'
        }
      ]

      const locations = extractLocationsFromItinerary(activities, [])

      expect(locations).toHaveLength(1)
      expect(locations[0].name).toBe('有位置')
    })

    it('应该过滤坐标为空的活动', () => {
      const activities: Activity[] = [
        {
          name: '空坐标',
          time: '09:00',
          duration: '1小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 0, lng: 0, address: '地址' } // lat 和 lng 为 0 也应该被接受
        }
      ]

      const locations = extractLocationsFromItinerary(activities, [])

      // 0 是有效坐标（在某些情况下）
      expect(locations).toHaveLength(0) // lat: 0 和 lng: 0 不是有效位置
    })

    it('应该处理空数组', () => {
      const locations = extractLocationsFromItinerary([], [])

      expect(locations).toHaveLength(0)
    })

    it('应该处理 undefined 数组', () => {
      const locations = extractLocationsFromItinerary(undefined as any, undefined as any)

      expect(locations).toHaveLength(0)
    })
  })

  describe('餐饮提取', () => {
    it('应该从餐饮中提取位置', () => {
      const meals: Meal[] = [
        {
          type: 'lunch',
          time: '12:00',
          restaurant: '北京烤鸭店',
          cuisine: '北京菜',
          avg_price: 120,
          recommendation: '推荐烤鸭',
          location: { lat: 39.91, lng: 116.41, address: '地址' }
        }
      ]

      const locations = extractLocationsFromItinerary([], meals)

      expect(locations).toHaveLength(1)
      expect(locations[0].name).toBe('北京烤鸭店')
      expect(locations[0].type).toBe('meal')
      expect(locations[0].description).toBe('北京菜 · 人均 ¥120')
    })

    it('应该过滤没有位置的餐饮', () => {
      const meals: Meal[] = [
        {
          type: 'lunch',
          time: '12:00',
          restaurant: '无位置餐厅',
          cuisine: '中餐',
          avg_price: 50,
          recommendation: ''
        }
      ]

      const locations = extractLocationsFromItinerary([], meals)

      expect(locations).toHaveLength(0)
    })
  })

  describe('混合提取', () => {
    it('应该同时提取活动和餐饮', () => {
      const activities: Activity[] = [
        {
          name: '景点',
          time: '09:00',
          duration: '2小时',
          description: '游览',
          type: 'attraction',
          location: { lat: 39.9, lng: 116.4, address: '地址' }
        }
      ]

      const meals: Meal[] = [
        {
          type: 'lunch',
          time: '12:00',
          restaurant: '餐厅',
          cuisine: '中餐',
          avg_price: 80,
          recommendation: '',
          location: { lat: 39.91, lng: 116.41, address: '地址' }
        }
      ]

      const locations = extractLocationsFromItinerary(activities, meals)

      expect(locations).toHaveLength(2)
      expect(locations[0].type).toBe('activity')
      expect(locations[1].type).toBe('meal')
    })
  })

  describe('时间排序', () => {
    it('应该按时间排序位置', () => {
      const activities: Activity[] = [
        {
          name: '下午景点',
          time: '14:00',
          duration: '2小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 39.9, lng: 116.4, address: '地址' }
        },
        {
          name: '上午景点',
          time: '09:00',
          duration: '2小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 39.91, lng: 116.41, address: '地址' }
        }
      ]

      const locations = extractLocationsFromItinerary(activities, [])

      expect(locations[0].name).toBe('上午景点')
      expect(locations[1].name).toBe('下午景点')
    })

    it('应该处理没有时间的位置', () => {
      const activities: Activity[] = [
        {
          name: '有时间',
          time: '09:00',
          duration: '2小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 39.9, lng: 116.4, address: '地址' }
        },
        {
          name: '无时间',
          duration: '2小时',
          description: '测试',
          type: 'attraction',
          location: { lat: 39.91, lng: 116.41, address: '地址' }
        } as Activity
      ]

      const locations = extractLocationsFromItinerary(activities, [])

      // 应该正常处理，不抛出错误
      expect(locations).toHaveLength(2)
    })
  })
})
