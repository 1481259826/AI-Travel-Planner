/**
 * PhotoCarousel 组件测试
 * 测试照片轮播功能、导航按钮、指示器、占位内容等
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PhotoCarousel from '@/components/shared/PhotoCarousel'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        {...props}
      />
    )
  }
}))

describe('PhotoCarousel', () => {
  const mockPhotos = [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
    'https://example.com/photo3.jpg'
  ]

  describe('基本渲染', () => {
    it('应该渲染单张照片', () => {
      render(
        <PhotoCarousel
          photos={[mockPhotos[0]]}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockPhotos[0])
    })

    it('应该渲染多张照片', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      expect(image).toBeInTheDocument()
      // 初始应该显示第一张照片
      expect(image).toHaveAttribute('src', mockPhotos[0])
    })

    it('应该应用自定义高度类名', () => {
      const { container } = render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
          heightClass="h-64"
        />
      )

      const carouselContainer = container.firstChild as HTMLElement
      expect(carouselContainer).toHaveClass('h-64')
    })

    it('应该应用默认高度类名', () => {
      const { container } = render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const carouselContainer = container.firstChild as HTMLElement
      expect(carouselContainer).toHaveClass('h-48')
    })

    it('应该应用自定义类名', () => {
      const { container } = render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
          className="custom-class"
        />
      )

      const carouselContainer = container.firstChild as HTMLElement
      expect(carouselContainer).toHaveClass('custom-class')
    })
  })

  describe('导航按钮', () => {
    it('单张照片时不应该显示导航按钮', () => {
      render(
        <PhotoCarousel
          photos={[mockPhotos[0]]}
          alt="测试照片"
        />
      )

      expect(screen.queryByLabelText('上一张图片')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('下一张图片')).not.toBeInTheDocument()
    })

    it('多张照片时应该显示导航按钮', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      expect(screen.getByLabelText('上一张图片')).toBeInTheDocument()
      expect(screen.getByLabelText('下一张图片')).toBeInTheDocument()
    })

    it('点击下一张按钮应该切换到下一张照片', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      const nextButton = screen.getByLabelText('下一张图片')

      // 初始显示第一张
      expect(image).toHaveAttribute('src', mockPhotos[0])

      // 点击下一张
      fireEvent.click(nextButton)
      expect(image).toHaveAttribute('src', mockPhotos[1])

      // 再点击下一张
      fireEvent.click(nextButton)
      expect(image).toHaveAttribute('src', mockPhotos[2])
    })

    it('点击上一张按钮应该切换到上一张照片', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      const prevButton = screen.getByLabelText('上一张图片')
      const nextButton = screen.getByLabelText('下一张图片')

      // 先切换到第二张
      fireEvent.click(nextButton)
      expect(image).toHaveAttribute('src', mockPhotos[1])

      // 点击上一张
      fireEvent.click(prevButton)
      expect(image).toHaveAttribute('src', mockPhotos[0])
    })

    it('在最后一张时点击下一张应该循环到第一张', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      const nextButton = screen.getByLabelText('下一张图片')

      // 切换到最后一张
      fireEvent.click(nextButton) // 第2张
      fireEvent.click(nextButton) // 第3张
      expect(image).toHaveAttribute('src', mockPhotos[2])

      // 再点击下一张应该循环到第一张
      fireEvent.click(nextButton)
      expect(image).toHaveAttribute('src', mockPhotos[0])
    })

    it('在第一张时点击上一张应该循环到最后一张', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      const prevButton = screen.getByLabelText('上一张图片')

      // 初始在第一张
      expect(image).toHaveAttribute('src', mockPhotos[0])

      // 点击上一张应该循环到最后一张
      fireEvent.click(prevButton)
      expect(image).toHaveAttribute('src', mockPhotos[2])
    })
  })

  describe('图片指示器', () => {
    it('单张照片时不应该显示指示器', () => {
      render(
        <PhotoCarousel
          photos={[mockPhotos[0]]}
          alt="测试照片"
        />
      )

      expect(screen.queryByLabelText('切换到第1张图片')).not.toBeInTheDocument()
    })

    it('多张照片时应该显示对应数量的指示器', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      expect(screen.getByLabelText('切换到第1张图片')).toBeInTheDocument()
      expect(screen.getByLabelText('切换到第2张图片')).toBeInTheDocument()
      expect(screen.getByLabelText('切换到第3张图片')).toBeInTheDocument()
    })

    it('点击指示器应该切换到对应照片', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')
      const indicator2 = screen.getByLabelText('切换到第2张图片')
      const indicator3 = screen.getByLabelText('切换到第3张图片')

      // 点击第2个指示器
      fireEvent.click(indicator2)
      expect(image).toHaveAttribute('src', mockPhotos[1])

      // 点击第3个指示器
      fireEvent.click(indicator3)
      expect(image).toHaveAttribute('src', mockPhotos[2])
    })

    it('当前指示器应该有不同的样式', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const indicator1 = screen.getByLabelText('切换到第1张图片')
      const indicator2 = screen.getByLabelText('切换到第2张图片')

      // 第一个指示器应该是激活状态（有 w-6 类）
      expect(indicator1).toHaveClass('w-6')
      expect(indicator2).not.toHaveClass('w-6')

      // 点击第2个指示器后，第2个应该是激活状态
      fireEvent.click(indicator2)
      expect(indicator1).not.toHaveClass('w-6')
      expect(indicator2).toHaveClass('w-6')
    })
  })

  describe('占位内容', () => {
    it('无照片时应该显示默认占位图标', () => {
      render(
        <PhotoCarousel
          photos={[]}
          alt="测试照片"
        />
      )

      // 应该显示图标（ImageIcon）
      const placeholderIcon = document.querySelector('.lucide-image')
      expect(placeholderIcon).toBeInTheDocument()
    })

    it('无照片时应该显示自定义占位内容', () => {
      render(
        <PhotoCarousel
          photos={[]}
          alt="测试照片"
          placeholderContent={<p>暂无照片</p>}
        />
      )

      expect(screen.getByText('暂无照片')).toBeInTheDocument()
    })

    it('图片加载失败时应该显示错误提示', async () => {
      render(
        <PhotoCarousel
          photos={[mockPhotos[0]]}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')

      // 触发图片加载错误
      fireEvent.error(image)

      // 应该显示错误提示
      await waitFor(() => {
        expect(screen.getByText('图片加载失败')).toBeInTheDocument()
      })
    })

    it('图片加载失败时应该显示占位图标', async () => {
      render(
        <PhotoCarousel
          photos={[mockPhotos[0]]}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')

      // 触发图片加载错误
      fireEvent.error(image)

      // 应该显示图标
      await waitFor(() => {
        const placeholderIcon = document.querySelector('.lucide-image')
        expect(placeholderIcon).toBeInTheDocument()
      })
    })

    it('图片加载失败后应该持续显示占位内容', async () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const image = screen.getByAltText('测试照片')

      // 触发第一张图片加载错误
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('图片加载失败')).toBeInTheDocument()
      })

      // 验证导航按钮和指示器已消失（因为进入占位模式）
      expect(screen.queryByLabelText('切换到第2张图片')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('上一张图片')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('下一张图片')).not.toBeInTheDocument()

      // 占位图标应该显示
      const placeholderIcon = document.querySelector('.lucide-image')
      expect(placeholderIcon).toBeInTheDocument()
    })
  })

  describe('覆盖层内容', () => {
    it('应该渲染顶部左侧覆盖内容', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
          topLeftOverlay={<span>左侧标签</span>}
        />
      )

      expect(screen.getByText('左侧标签')).toBeInTheDocument()
    })

    it('应该渲染顶部右侧覆盖内容', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
          topRightOverlay={<button>删除</button>}
        />
      )

      expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    })

    it('应该同时渲染左右两侧覆盖内容', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
          topLeftOverlay={<span>左侧标签</span>}
          topRightOverlay={<button>删除</button>}
        />
      )

      expect(screen.getByText('左侧标签')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    })

    it('无照片时也应该显示顶部右侧覆盖内容', () => {
      render(
        <PhotoCarousel
          photos={[]}
          alt="测试照片"
          topRightOverlay={<button>删除</button>}
        />
      )

      expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    })

    it('无照片时不应该显示顶部左侧覆盖内容', () => {
      render(
        <PhotoCarousel
          photos={[]}
          alt="测试照片"
          topLeftOverlay={<span>左侧标签</span>}
        />
      )

      expect(screen.queryByText('左侧标签')).not.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      const { container } = render(
        <PhotoCarousel
          photos={[]}
          alt="测试照片"
        />
      )

      expect(container.firstChild).toBeInTheDocument()
      const placeholderIcon = document.querySelector('.lucide-image')
      expect(placeholderIcon).toBeInTheDocument()
    })

    it('应该处理 undefined 照片', () => {
      const { container } = render(
        <PhotoCarousel
          photos={[undefined as any, null as any]}
          alt="测试照片"
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理极长的照片数组', () => {
      const manyPhotos = Array.from({ length: 20 }, (_, i) => `photo${i}.jpg`)

      render(
        <PhotoCarousel
          photos={manyPhotos}
          alt="测试照片"
        />
      )

      // 应该有20个指示器
      manyPhotos.forEach((_, i) => {
        expect(screen.getByLabelText(`切换到第${i + 1}张图片`)).toBeInTheDocument()
      })
    })
  })

  describe('可访问性', () => {
    it('导航按钮应该有正确的 aria-label', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      const prevButton = screen.getByLabelText('上一张图片')
      const nextButton = screen.getByLabelText('下一张图片')

      expect(prevButton).toHaveAttribute('aria-label', '上一张图片')
      expect(nextButton).toHaveAttribute('aria-label', '下一张图片')
    })

    it('指示器应该有正确的 aria-label', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="测试照片"
        />
      )

      mockPhotos.forEach((_, i) => {
        const indicator = screen.getByLabelText(`切换到第${i + 1}张图片`)
        expect(indicator).toHaveAttribute('aria-label', `切换到第${i + 1}张图片`)
      })
    })

    it('图片应该有正确的 alt 属性', () => {
      render(
        <PhotoCarousel
          photos={mockPhotos}
          alt="美丽的风景"
        />
      )

      const image = screen.getByAltText('美丽的风景')
      expect(image).toHaveAttribute('alt', '美丽的风景')
    })
  })
})
