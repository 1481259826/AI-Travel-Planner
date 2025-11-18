'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { usePhotoCarousel } from '@/hooks/usePhotoCarousel'

interface PhotoCarouselProps {
  /** 照片 URL 数组 */
  photos: string[]
  /** 图片 alt 文本 */
  alt: string
  /** 容器高度类名，默认 "h-48" */
  heightClass?: string
  /** 顶部左侧覆盖内容（如类型标签） */
  topLeftOverlay?: React.ReactNode
  /** 顶部右侧覆盖内容（如删除按钮） */
  topRightOverlay?: React.ReactNode
  /** 占位内容（无图片时显示） */
  placeholderContent?: React.ReactNode
  /** 自定义类名 */
  className?: string
}

/**
 * 照片轮播组件
 * 支持多张照片导航、占位内容、覆盖层等功能
 */
export default function PhotoCarousel({
  photos,
  alt,
  heightClass = 'h-48',
  topLeftOverlay,
  topRightOverlay,
  placeholderContent,
  className = ''
}: PhotoCarouselProps) {
  const {
    currentIndex,
    currentPhoto,
    hasPhotos,
    nextPhoto,
    prevPhoto,
    goToPhoto
  } = usePhotoCarousel({ photos })

  const [imageError, setImageError] = useState(false)

  // 无照片或图片加载失败时显示占位内容
  if (!hasPhotos || imageError || !currentPhoto) {
    return (
      <div className={`relative ${heightClass} bg-gray-100 dark:bg-gray-700 ${className}`}>
        <div className="relative w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <ImageIcon className="w-16 h-16 mb-2" />
          {imageError && <p className="text-sm mt-2">图片加载失败</p>}
          {placeholderContent}
        </div>
        {/* 顶部右侧覆盖内容（即使无图片也显示，如删除按钮） */}
        {topRightOverlay}
      </div>
    )
  }

  return (
    <div className={`relative ${heightClass} bg-gray-100 dark:bg-gray-700 ${className}`}>
      {/* 主图片 */}
      <Image
        src={currentPhoto}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onError={() => setImageError(true)}
      />

      {/* 导航按钮（多张图片时显示） */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="上一张图片"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            aria-label="下一张图片"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 图片指示器 */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  goToPhoto(index)
                  setImageError(false)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`切换到第${index + 1}张图片`}
              />
            ))}
          </div>
        </>
      )}

      {/* 顶部左侧覆盖内容（如类型标签） */}
      {topLeftOverlay && (
        <div className="absolute top-2 left-2">
          {topLeftOverlay}
        </div>
      )}

      {/* 顶部右侧覆盖内容（如删除按钮） */}
      {topRightOverlay && (
        <div className="absolute top-2 right-2">
          {topRightOverlay}
        </div>
      )}
    </div>
  )
}
