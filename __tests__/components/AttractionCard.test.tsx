/**
 * AttractionCard 组件测试
 * 测试景点卡片显示、照片轮播、评分、编辑模式等功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AttractionCard from '@/components/AttractionCard'
import { Activity } from '@/types'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: any) => (
    <img src={src} alt={alt} onError={onError} {...props} />
  )
}))

// Mock lucide-react 图标
vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="map-pin-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  DollarSign: () => <span data-testid="dollar-sign-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  ChevronUp: () => <span data-testid="chevron-up-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Image: () => <span data-testid="image-icon" className="lucide-image" />,
  ChevronLeft: () => <span data-testid="chevron-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />
}))

describe('AttractionCard', () => {
  // 基础测试数据
  const mockActivity: Activity = {
    name: '故宫博物院',
    type: 'attraction',
    time: '09:00',
    duration: '3小时',
    location: {
      name: '故宫',
      address: '北京市东城区景山前街4号',
      coordinates: { lat: 39.9163, lng: 116.3972 }
    },
    description: '中国古代宫殿建筑之精华',
    rating: 4.8,
    ticket_price: 60,
    tips: '建议提前网上预约门票'
  }

  // 带有增强信息的测试数据
  const mockEnrichedActivity: Activity = {
    ...mockActivity,
    short_desc: '中国明清两代的皇家宫殿',
    long_desc: '故宫又名紫禁城，是中国明清两代的皇家宫殿，位于北京中轴线的中心。故宫以三大殿为中心，占地面积72万平方米，建筑面积约15万平方米，有大小宫殿七十多座，房屋九千余间。',
    photos: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg'
    ]
  }

  describe('基本渲染', () => {
    it('应该渲染景点名称', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('故宫博物院')).toBeInTheDocument()
    })

    it('应该渲染时间和时长', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('09:00')).toBeInTheDocument()
      expect(screen.getByText('3小时')).toBeInTheDocument()
    })

    it('应该渲染地点信息', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('故宫')).toBeInTheDocument()
      expect(screen.getByText('北京市东城区景山前街4号')).toBeInTheDocument()
    })

    it('应该渲染门票价格', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('门票 ¥60')).toBeInTheDocument()
    })

    it('无门票价格时不应该渲染价格区域', () => {
      const activityWithoutPrice = { ...mockActivity, ticket_price: undefined, tips: undefined }
      render(<AttractionCard activity={activityWithoutPrice} />)

      expect(screen.queryByTestId('dollar-sign-icon')).not.toBeInTheDocument()
    })

    it('门票价格为0时不应该渲染价格区域', () => {
      const freeActivity = { ...mockActivity, ticket_price: 0, tips: undefined }
      render(<AttractionCard activity={freeActivity} />)

      expect(screen.queryByTestId('dollar-sign-icon')).not.toBeInTheDocument()
    })

    it('应该渲染旅行建议', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('旅行建议')).toBeInTheDocument()
      expect(screen.getByText('建议提前网上预约门票')).toBeInTheDocument()
    })

    it('无旅行建议时不应该渲染建议区域', () => {
      const activityWithoutTips = { ...mockActivity, tips: undefined }
      render(<AttractionCard activity={activityWithoutTips} />)

      expect(screen.queryByText('旅行建议')).not.toBeInTheDocument()
    })
  })

  describe('活动类型', () => {
    it('应该正确显示景点类型标签', () => {
      // 使用带照片的活动，因为 topLeftOverlay 只在有照片时显示
      render(<AttractionCard activity={mockEnrichedActivity} />)

      expect(screen.getByText('景点')).toBeInTheDocument()
    })

    it('应该正确显示购物类型标签', () => {
      const shoppingActivity = { ...mockEnrichedActivity, type: 'shopping' as const }
      render(<AttractionCard activity={shoppingActivity} />)

      expect(screen.getByText('购物')).toBeInTheDocument()
    })

    it('应该正确显示娱乐类型标签', () => {
      const entertainmentActivity = { ...mockEnrichedActivity, type: 'entertainment' as const }
      render(<AttractionCard activity={entertainmentActivity} />)

      expect(screen.getByText('娱乐')).toBeInTheDocument()
    })

    it('应该正确显示休闲类型标签', () => {
      const relaxationActivity = { ...mockEnrichedActivity, type: 'relaxation' as const }
      render(<AttractionCard activity={relaxationActivity} />)

      expect(screen.getByText('休闲')).toBeInTheDocument()
    })
  })

  describe('评分显示', () => {
    it('应该显示评分', () => {
      render(<AttractionCard activity={mockActivity} />)

      // RatingDisplay 显示格式为 "4.8 分"
      expect(screen.getByText('4.8 分')).toBeInTheDocument()
    })

    it('无评分时不应该显示评分区域', () => {
      const activityWithoutRating = { ...mockActivity, rating: undefined }
      render(<AttractionCard activity={activityWithoutRating} />)

      expect(screen.queryByText(/分$/)).not.toBeInTheDocument()
    })
  })

  describe('描述显示', () => {
    it('无增强描述时应该显示原始描述', () => {
      render(<AttractionCard activity={mockActivity} />)

      expect(screen.getByText('中国古代宫殿建筑之精华')).toBeInTheDocument()
    })

    it('有增强描述时应该显示简短描述', () => {
      render(<AttractionCard activity={mockEnrichedActivity} />)

      expect(screen.getByText('中国明清两代的皇家宫殿')).toBeInTheDocument()
    })

    it('有长描述时应该显示展开按钮', () => {
      render(<AttractionCard activity={mockEnrichedActivity} />)

      expect(screen.getByText('查看更多')).toBeInTheDocument()
    })

    it('点击展开按钮应该展开长描述', () => {
      render(<AttractionCard activity={mockEnrichedActivity} />)

      const expandButton = screen.getByText('查看更多')
      fireEvent.click(expandButton)

      expect(screen.getByText('收起')).toBeInTheDocument()
    })

    it('点击收起按钮应该收起长描述', () => {
      render(<AttractionCard activity={mockEnrichedActivity} />)

      // 先展开
      fireEvent.click(screen.getByText('查看更多'))
      // 再收起
      fireEvent.click(screen.getByText('收起'))

      expect(screen.getByText('查看更多')).toBeInTheDocument()
    })
  })

  describe('获取图片和描述功能', () => {
    it('无照片时应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(<AttractionCard activity={mockActivity} onEnrich={onEnrich} />)

      expect(screen.getByText('获取图片和描述')).toBeInTheDocument()
    })

    it('点击获取按钮应该调用 onEnrich', () => {
      const onEnrich = vi.fn()
      render(<AttractionCard activity={mockActivity} onEnrich={onEnrich} />)

      fireEvent.click(screen.getByText('获取图片和描述'))

      expect(onEnrich).toHaveBeenCalledWith(mockActivity)
    })

    it('正在加载时应该显示加载状态', () => {
      const onEnrich = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          onEnrich={onEnrich}
          isEnriching={true}
        />
      )

      expect(screen.getByText('正在加载...')).toBeInTheDocument()
    })

    it('正在加载时不应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          onEnrich={onEnrich}
          isEnriching={true}
        />
      )

      expect(screen.queryByText('获取图片和描述')).not.toBeInTheDocument()
    })

    it('有照片时不应该显示获取按钮', () => {
      const onEnrich = vi.fn()
      render(
        <AttractionCard
          activity={mockEnrichedActivity}
          onEnrich={onEnrich}
        />
      )

      expect(screen.queryByText('获取图片和描述')).not.toBeInTheDocument()
    })
  })

  describe('编辑模式', () => {
    it('编辑模式下应该显示删除按钮', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={true}
          onDelete={onDelete}
        />
      )

      expect(screen.getByLabelText('删除活动')).toBeInTheDocument()
    })

    it('非编辑模式下不应该显示删除按钮', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={false}
          onDelete={onDelete}
        />
      )

      expect(screen.queryByLabelText('删除活动')).not.toBeInTheDocument()
    })

    it('点击删除按钮应该显示确认对话框', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={true}
          onDelete={onDelete}
        />
      )

      fireEvent.click(screen.getByLabelText('删除活动'))

      expect(screen.getByText('确认删除活动？')).toBeInTheDocument()
      // 景点名称在卡片和对话框中都出现
      expect(screen.getAllByText('故宫博物院')).toHaveLength(2)
    })

    it('确认删除应该调用 onDelete', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={true}
          onDelete={onDelete}
        />
      )

      // 打开删除对话框
      fireEvent.click(screen.getByLabelText('删除活动'))
      // 确认删除
      fireEvent.click(screen.getByText('确认删除'))

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('取消删除不应该调用 onDelete', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={true}
          onDelete={onDelete}
        />
      )

      // 打开删除对话框
      fireEvent.click(screen.getByLabelText('删除活动'))
      // 取消删除
      fireEvent.click(screen.getByText('取消'))

      expect(onDelete).not.toHaveBeenCalled()
    })

    it('取消后应该关闭对话框', () => {
      const onDelete = vi.fn()
      render(
        <AttractionCard
          activity={mockActivity}
          isEditMode={true}
          onDelete={onDelete}
        />
      )

      // 打开删除对话框
      fireEvent.click(screen.getByLabelText('删除活动'))
      expect(screen.getByText('确认删除活动？')).toBeInTheDocument()

      // 取消删除
      fireEvent.click(screen.getByText('取消'))

      // 对话框应该关闭
      expect(screen.queryByText('确认删除活动？')).not.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理无 duration 的情况', () => {
      const activityWithoutDuration = { ...mockActivity, duration: undefined }
      render(<AttractionCard activity={activityWithoutDuration} />)

      expect(screen.getByText('09:00')).toBeInTheDocument()
      // duration 分隔符不应该显示
      expect(screen.queryByText('·')).not.toBeInTheDocument()
    })

    it('应该处理空照片数组', () => {
      const activityWithEmptyPhotos = { ...mockActivity, photos: [] }
      render(<AttractionCard activity={activityWithEmptyPhotos} />)

      // 应该显示占位图标
      const placeholderIcon = document.querySelector('.lucide-image')
      expect(placeholderIcon).toBeInTheDocument()
    })

    it('应该处理长景点名称', () => {
      const longNameActivity = {
        ...mockActivity,
        name: '这是一个非常非常长的景点名称用于测试文本截断和布局'
      }
      render(<AttractionCard activity={longNameActivity} />)

      expect(screen.getByText(longNameActivity.name)).toBeInTheDocument()
    })

    it('应该处理长地址', () => {
      const longAddressActivity = {
        ...mockActivity,
        location: {
          ...mockActivity.location,
          address: '这是一个非常非常长的地址信息用于测试文本换行和布局显示效果'
        }
      }
      render(<AttractionCard activity={longAddressActivity} />)

      expect(screen.getByText(longAddressActivity.location.address)).toBeInTheDocument()
    })
  })

  describe('样式', () => {
    it('卡片应该有正确的容器样式', () => {
      const { container } = render(<AttractionCard activity={mockActivity} />)

      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('shadow-md')
    })

    it('旅行建议应该有黄色背景', () => {
      render(<AttractionCard activity={mockActivity} />)

      // 旅行建议容器有 bg-amber-50 类
      const tipsText = screen.getByText('建议提前网上预约门票')
      // 结构：div.bg-amber-50 > div.flex > div.flex-1 > div.text-sm (tips text)
      const tipsContainer = tipsText.closest('.bg-amber-50')
      expect(tipsContainer).toBeInTheDocument()
    })
  })
})
