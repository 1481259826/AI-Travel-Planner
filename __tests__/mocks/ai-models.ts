/**
 * AI 模型 Mock
 * 用于测试 AI 相关功能
 */

import { vi } from 'vitest'
import type { Itinerary } from '@/types'

// Mock AI 生成的行程数据
export const mockGeneratedItinerary: Itinerary = {
  destination: '上海',
  startDate: '2025-02-01',
  endDate: '2025-02-03',
  totalDays: 3,
  budget: 3000,
  accommodation: {
    name: '上海假日酒店',
    address: '上海市黄浦区南京东路100号',
    pricePerNight: 500,
    totalPrice: 1500,
    checkIn: '2025-02-01',
    checkOut: '2025-02-04',
    rating: 4.5,
    amenities: ['WiFi', '早餐', '健身房'],
    location: {
      lat: 31.234,
      lng: 121.475,
    },
  },
  days: [
    {
      day: 1,
      date: '2025-02-01',
      theme: '抵达和城市探索',
      activities: [
        {
          time: '09:00',
          type: 'attraction',
          name: '外滩',
          description: '上海标志性景点，欣赏黄浦江两岸风光',
          duration: 2,
          cost: 0,
          location: {
            address: '上海市黄浦区中山东一路',
            lat: 31.239,
            lng: 121.485,
          },
          rating: 4.8,
        },
        {
          time: '12:00',
          type: 'food',
          name: '南京路步行街午餐',
          description: '品尝上海本帮菜',
          duration: 1.5,
          cost: 150,
          location: {
            address: '上海市黄浦区南京东路',
            lat: 31.235,
            lng: 121.478,
          },
        },
        {
          time: '14:00',
          type: 'attraction',
          name: '上海博物馆',
          description: '参观中国古代艺术珍品',
          duration: 2.5,
          cost: 0,
          location: {
            address: '上海市黄浦区人民大道201号',
            lat: 31.228,
            lng: 121.475,
          },
          rating: 4.7,
        },
      ],
    },
    {
      day: 2,
      date: '2025-02-02',
      theme: '历史文化',
      activities: [
        {
          time: '09:00',
          type: 'attraction',
          name: '豫园',
          description: '明代私家园林，体验传统建筑',
          duration: 2,
          cost: 40,
          location: {
            address: '上海市黄浦区安仁街137号',
            lat: 31.226,
            lng: 121.492,
          },
          rating: 4.6,
        },
      ],
    },
    {
      day: 3,
      date: '2025-02-03',
      theme: '现代都市',
      activities: [
        {
          time: '09:00',
          type: 'attraction',
          name: '东方明珠',
          description: '登顶观光塔，俯瞰上海全景',
          duration: 2,
          cost: 180,
          location: {
            address: '上海市浦东新区世纪大道1号',
            lat: 31.240,
            lng: 121.499,
          },
          rating: 4.5,
        },
      ],
    },
  ],
  estimatedCost: {
    accommodation: 1500,
    food: 600,
    transportation: 200,
    attractions: 400,
    total: 2700,
  },
  notes: [
    '建议提前预订酒店和热门景点门票',
    '上海地铁便利，建议购买交通卡',
  ],
}

/**
 * Mock OpenAI 兼容的 AI 客户端
 */
export function createMockAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockGeneratedItinerary),
              },
            },
          ],
        }),
      },
    },
  }
}

/**
 * Mock AI 工具函数
 */
export const mockAIHelper = {
  createAIClient: vi.fn().mockReturnValue(createMockAIClient()),
  buildItineraryPrompt: vi.fn().mockReturnValue('Mock prompt'),
  generateItinerary: vi.fn().mockResolvedValue(mockGeneratedItinerary),
}

/**
 * Mock 坐标修正函数
 */
export const mockCoordinateFixer = {
  correctItineraryCoordinates: vi.fn().mockImplementation(async (itinerary: Itinerary) => {
    // 返回带有修正坐标的行程（实际上不修改，只是返回）
    return itinerary
  }),
}
