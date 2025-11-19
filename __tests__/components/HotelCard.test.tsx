/**
 * HotelCard 组件测试
 * 测试酒店卡片显示、照片轮播、评分、设施等功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HotelCard from '@/components/HotelCard'
import { Accommodation } from '@/types'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: any) => (
    <img src={src} alt={alt} onError={onError} {...props} />
  )
}))

// Mock lucide-react 图标
vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="map-pin-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  DollarSign: () => <span data-testid="dollar-sign-icon" />,
  Wifi: () => <span data-testid="wifi-icon" />,
  Coffee: () => <span data-testid="coffee-icon" />,
  Utensils: () => <span data-testid="utensils-icon" />,
  Dumbbell: () => <span data-testid="dumbbell-icon" />,
  Waves: () => <span data-testid="waves-icon" />,
  ShieldCheck: () => <span data-testid="shield-icon" />,
  Car: () => <span data-testid="car-icon" />,
  Wind: () => <span data-testid="wind-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  ChevronUp: () => <span data-testid="chevron-up-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Image: () => <span data-testid="image-icon" className="lucide-image" />,
  ChevronLeft: () => <span data-testid="chevron-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />
}))

describe('HotelCard', () => {
  // 基础测试数据
  const mockHotel: Accommodation = {
    name: '北京万豪酒店',
    type: 'hotel',
    check_in: '2024-01-15',
    check_out: '2024-01-18',
    price_per_night: 800,
    total_price: 2400,
    location: {
      name: '王府井商圈',
      address: '北京市东城区王府井大街138号',
      coordinates: { lat: 39.9147, lng: 116.4095 }
    },
    rating: 4.7,
    amenities: ['免费WiFi', '早餐', '健身房', '游泳池', '停车场'],
    description: '五星级豪华酒店，位于王府井核心商圈'
  }

  // 带有照片的测试数据
  const mockHotelWithPhotos: Accommodation = {
    ...mockHotel,
    photos: [
      'https://example.com/hotel1.jpg',
      'https://example.com/hotel2.jpg'
    ]
  }

  describe('基本渲染', () => {
    it('应该渲染酒店名称', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('北京万豪酒店')).toBeInTheDocument()
    })

    it('应该渲染入住和退房日期', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('01/15')).toBeInTheDocument()
      expect(screen.getByText('01/18')).toBeInTheDocument()
    })

    it('应该渲染住宿天数', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('3 晚')).toBeInTheDocument()
    })

    it('应该渲染地点信息', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('王府井商圈')).toBeInTheDocument()
      expect(screen.getByText('北京市东城区王府井大街138号')).toBeInTheDocument()
    })

    it('应该渲染价格信息', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('¥800')).toBeInTheDocument()
      expect(screen.getByText('/晚')).toBeInTheDocument()
      expect(screen.getByText('¥2400')).toBeInTheDocument()
    })

    it('应该渲染设施标签', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('免费WiFi')).toBeInTheDocument()
      expect(screen.getByText('早餐')).toBeInTheDocument()
      expect(screen.getByText('健身房')).toBeInTheDocument()
      expect(screen.getByText('游泳池')).toBeInTheDocument()
      expect(screen.getByText('停车场')).toBeInTheDocument()
    })

    it('无设施时不应该显示设施区域', () => {
      const hotelWithoutAmenities = { ...mockHotel, amenities: undefined }
      render(<HotelCard hotel={hotelWithoutAmenities} />)

      expect(screen.queryByText('设施服务')).not.toBeInTheDocument()
    })

    it('空设施数组时不应该显示设施区域', () => {
      const hotelWithEmptyAmenities = { ...mockHotel, amenities: [] }
      render(<HotelCard hotel={hotelWithEmptyAmenities} />)

      expect(screen.queryByText('设施服务')).not.toBeInTheDocument()
    })
  })

  describe('酒店类型', () => {
    it('应该正确显示酒店类型标签', () => {
      render(<HotelCard hotel={mockHotelWithPhotos} />)

      // 类型标签在有照片时显示
      expect(screen.getByText('酒店')).toBeInTheDocument()
    })

    it('应该正确显示青年旅舍类型标签', () => {
      const hostelHotel = { ...mockHotelWithPhotos, type: 'hostel' as const }
      render(<HotelCard hotel={hostelHotel} />)

      expect(screen.getByText('青年旅舍')).toBeInTheDocument()
    })

    it('应该正确显示公寓类型标签', () => {
      const apartmentHotel = { ...mockHotelWithPhotos, type: 'apartment' as const }
      render(<HotelCard hotel={apartmentHotel} />)

      expect(screen.getByText('公寓')).toBeInTheDocument()
    })

    it('应该正确显示民宿类型标签', () => {
      const guesthouse = { ...mockHotelWithPhotos, type: 'guesthouse' as const }
      render(<HotelCard hotel={guesthouse} />)

      expect(screen.getByText('民宿')).toBeInTheDocument()
    })
  })

  describe('评分显示', () => {
    it('应该显示评分', () => {
      render(<HotelCard hotel={mockHotel} />)

      // RatingDisplay 显示格式为 "4.7 分"
      expect(screen.getByText('4.7 分')).toBeInTheDocument()
    })

    it('无评分时不应该显示评分区域', () => {
      const hotelWithoutRating = { ...mockHotel, rating: undefined }
      render(<HotelCard hotel={hotelWithoutRating} />)

      expect(screen.queryByText(/分$/)).not.toBeInTheDocument()
    })
  })

  describe('描述显示', () => {
    it('有描述时应该显示描述', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('五星级豪华酒店，位于王府井核心商圈')).toBeInTheDocument()
    })

    it('有描述时应该显示展开按钮', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.getByText('查看更多')).toBeInTheDocument()
    })

    it('点击展开按钮应该展开描述', () => {
      render(<HotelCard hotel={mockHotel} />)

      const expandButton = screen.getByText('查看更多')
      fireEvent.click(expandButton)

      expect(screen.getByText('收起')).toBeInTheDocument()
    })

    it('点击收起按钮应该收起描述', () => {
      render(<HotelCard hotel={mockHotel} />)

      // 先展开
      fireEvent.click(screen.getByText('查看更多'))
      // 再收起
      fireEvent.click(screen.getByText('收起'))

      expect(screen.getByText('查看更多')).toBeInTheDocument()
    })

    it('无描述时不应该显示描述区域', () => {
      const hotelWithoutDescription = { ...mockHotel, description: undefined }
      render(<HotelCard hotel={hotelWithoutDescription} />)

      expect(screen.queryByText('查看更多')).not.toBeInTheDocument()
    })
  })

  describe('地图查看功能', () => {
    it('有 onShowOnMap 回调时应该显示地图查看按钮', () => {
      const onShowOnMap = vi.fn()
      render(<HotelCard hotel={mockHotel} onShowOnMap={onShowOnMap} />)

      expect(screen.getByText('地图查看')).toBeInTheDocument()
    })

    it('点击地图查看按钮应该调用 onShowOnMap', () => {
      const onShowOnMap = vi.fn()
      render(<HotelCard hotel={mockHotel} onShowOnMap={onShowOnMap} />)

      fireEvent.click(screen.getByText('地图查看'))

      expect(onShowOnMap).toHaveBeenCalledTimes(1)
    })

    it('无 onShowOnMap 回调时不应该显示地图查看按钮', () => {
      render(<HotelCard hotel={mockHotel} />)

      expect(screen.queryByText('地图查看')).not.toBeInTheDocument()
    })
  })

  describe('获取图片和描述功能', () => {
    it('无照片时应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(<HotelCard hotel={mockHotel} onEnrich={onEnrich} />)

      expect(screen.getByText('获取图片和描述')).toBeInTheDocument()
    })

    it('点击获取按钮应该调用 onEnrich', () => {
      const onEnrich = vi.fn()
      render(<HotelCard hotel={mockHotel} onEnrich={onEnrich} />)

      fireEvent.click(screen.getByText('获取图片和描述'))

      expect(onEnrich).toHaveBeenCalledWith(mockHotel)
    })

    it('正在加载时应该显示加载状态', () => {
      const onEnrich = vi.fn()
      render(
        <HotelCard
          hotel={mockHotel}
          onEnrich={onEnrich}
          isEnriching={true}
        />
      )

      expect(screen.getByText('正在加载...')).toBeInTheDocument()
    })

    it('正在加载时不应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(
        <HotelCard
          hotel={mockHotel}
          onEnrich={onEnrich}
          isEnriching={true}
        />
      )

      expect(screen.queryByText('获取图片和描述')).not.toBeInTheDocument()
    })

    it('有照片时不应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(
        <HotelCard
          hotel={mockHotelWithPhotos}
          onEnrich={onEnrich}
        />
      )

      expect(screen.queryByText('获取图片和描述')).not.toBeInTheDocument()
    })
  })

  describe('设施图标', () => {
    it('WiFi 设施应该显示 WiFi 图标', () => {
      const hotelWithWifi = { ...mockHotel, amenities: ['免费WiFi'] }
      render(<HotelCard hotel={hotelWithWifi} />)

      expect(screen.getByTestId('wifi-icon')).toBeInTheDocument()
    })

    it('早餐设施应该显示餐具图标', () => {
      const hotelWithBreakfast = { ...mockHotel, amenities: ['早餐'] }
      render(<HotelCard hotel={hotelWithBreakfast} />)

      expect(screen.getByTestId('utensils-icon')).toBeInTheDocument()
    })

    it('健身房设施应该显示健身图标', () => {
      const hotelWithGym = { ...mockHotel, amenities: ['健身房'] }
      render(<HotelCard hotel={hotelWithGym} />)

      expect(screen.getByTestId('dumbbell-icon')).toBeInTheDocument()
    })

    it('游泳池设施应该显示游泳图标', () => {
      const hotelWithPool = { ...mockHotel, amenities: ['游泳池'] }
      render(<HotelCard hotel={hotelWithPool} />)

      expect(screen.getByTestId('waves-icon')).toBeInTheDocument()
    })

    it('停车场设施应该显示汽车图标', () => {
      const hotelWithParking = { ...mockHotel, amenities: ['停车场'] }
      render(<HotelCard hotel={hotelWithParking} />)

      expect(screen.getByTestId('car-icon')).toBeInTheDocument()
    })

    it('空调设施应该显示风扇图标', () => {
      const hotelWithAC = { ...mockHotel, amenities: ['空调'] }
      render(<HotelCard hotel={hotelWithAC} />)

      expect(screen.getByTestId('wind-icon')).toBeInTheDocument()
    })

    it('未知设施应该显示默认咖啡图标', () => {
      const hotelWithUnknown = { ...mockHotel, amenities: ['其他服务'] }
      render(<HotelCard hotel={hotelWithUnknown} />)

      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument()
    })
  })

  describe('住宿天数计算', () => {
    it('应该正确计算1晚', () => {
      const oneNight = {
        ...mockHotel,
        check_in: '2024-01-15',
        check_out: '2024-01-16'
      }
      render(<HotelCard hotel={oneNight} />)

      expect(screen.getByText('1 晚')).toBeInTheDocument()
    })

    it('应该正确计算7晚', () => {
      const sevenNights = {
        ...mockHotel,
        check_in: '2024-01-15',
        check_out: '2024-01-22'
      }
      render(<HotelCard hotel={sevenNights} />)

      expect(screen.getByText('7 晚')).toBeInTheDocument()
    })

    it('应该正确处理跨月住宿', () => {
      const crossMonth = {
        ...mockHotel,
        check_in: '2024-01-30',
        check_out: '2024-02-02'
      }
      render(<HotelCard hotel={crossMonth} />)

      expect(screen.getByText('3 晚')).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空照片数组', () => {
      const hotelWithEmptyPhotos = { ...mockHotel, photos: [] }
      render(<HotelCard hotel={hotelWithEmptyPhotos} />)

      // 应该显示占位图标
      const placeholderIcon = document.querySelector('.lucide-image')
      expect(placeholderIcon).toBeInTheDocument()
    })

    it('应该处理长酒店名称', () => {
      const longNameHotel = {
        ...mockHotel,
        name: '这是一个非常非常长的酒店名称用于测试文本截断和布局'
      }
      render(<HotelCard hotel={longNameHotel} />)

      expect(screen.getByText(longNameHotel.name)).toBeInTheDocument()
    })

    it('应该处理长地址', () => {
      const longAddressHotel = {
        ...mockHotel,
        location: {
          ...mockHotel.location,
          address: '这是一个非常非常长的地址信息用于测试文本换行和布局显示效果'
        }
      }
      render(<HotelCard hotel={longAddressHotel} />)

      expect(screen.getByText(longAddressHotel.location.address)).toBeInTheDocument()
    })

    it('应该处理大量设施', () => {
      const manyAmenities = {
        ...mockHotel,
        amenities: Array.from({ length: 20 }, (_, i) => `设施${i + 1}`)
      }
      render(<HotelCard hotel={manyAmenities} />)

      // 所有设施都应该渲染
      manyAmenities.amenities?.forEach(amenity => {
        expect(screen.getByText(amenity)).toBeInTheDocument()
      })
    })
  })

  describe('样式', () => {
    it('卡片应该有正确的容器样式', () => {
      const { container } = render(<HotelCard hotel={mockHotel} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('shadow-md')
    })

    it('住宿天数标签应该有蓝色背景', () => {
      render(<HotelCard hotel={mockHotel} />)

      const nightsBadge = screen.getByText('3 晚')
      expect(nightsBadge).toHaveClass('bg-blue-50')
    })
  })
})
