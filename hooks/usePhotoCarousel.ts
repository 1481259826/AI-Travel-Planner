/**
 * usePhotoCarousel Hook
 * 管理照片轮播功能的状态和逻辑
 */

import { useState } from 'react'

export interface UsePhotoCarouselOptions {
  /** 照片列表 */
  photos: string[]
  /** 初始索引 */
  initialIndex?: number
}

export interface UsePhotoCarouselResult {
  /** 当前照片索引 */
  currentIndex: number
  /** 当前照片 URL */
  currentPhoto: string | undefined
  /** 是否有照片 */
  hasPhotos: boolean
  /** 切换到下一张 */
  nextPhoto: () => void
  /** 切换到上一张 */
  prevPhoto: () => void
  /** 切换到指定索引 */
  goToPhoto: (index: number) => void
  /** 重置到第一张 */
  reset: () => void
}

/**
 * 照片轮播 Hook
 */
export function usePhotoCarousel(options: UsePhotoCarouselOptions): UsePhotoCarouselResult {
  const { photos, initialIndex = 0 } = options
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const hasPhotos = photos && photos.length > 0
  const currentPhoto = photos[currentIndex]

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const goToPhoto = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index)
    }
  }

  const reset = () => {
    setCurrentIndex(initialIndex)
  }

  return {
    currentIndex,
    currentPhoto,
    hasPhotos,
    nextPhoto,
    prevPhoto,
    goToPhoto,
    reset,
  }
}
