// User types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created_at: string
}

// Trip types - 从 supabase.d.ts 导出以保持一致性
export type { Trip, TripStatus, TripInsert, TripUpdate } from './supabase'

export interface Itinerary {
  days: DayPlan[]
  accommodation: Accommodation[]
  transportation: Transportation
  estimated_cost: CostBreakdown
  /** 别名，与 estimated_cost 相同 */
  cost_breakdown?: CostBreakdown
  summary: string
}

export interface DayPlan {
  day: number
  date: string
  activities: Activity[]
  meals: Meal[]
}

export interface Activity {
  time: string
  name: string
  type: 'attraction' | 'shopping' | 'entertainment' | 'relaxation'
  location: Location
  duration: string
  description: string
  ticket_price?: number
  tips?: string
  // 景点图片与描述增强
  photos?: string[]       // 景点图片 URL 数组
  short_desc?: string     // AI 生成的简短描述（1-2 行）
  long_desc?: string      // AI 生成的详细介绍（3-4 行）
  rating?: number         // 景点评分（0-5）
}

export interface Meal {
  time: string
  restaurant: string
  cuisine: string
  location: Location
  avg_price: number
  recommended_dishes: string[]
}

export interface Location {
  name: string
  address: string
  lat: number
  lng: number
}

export interface Accommodation {
  name: string
  type: 'hotel' | 'hostel' | 'apartment' | 'resort'
  location: Location
  check_in: string
  check_out: string
  price_per_night: number
  total_price: number
  rating?: number
  amenities?: string[]
  photos?: string[] // 酒店照片（增强功能）
  description?: string // AI生成的详细描述（增强功能）
}

export interface Transportation {
  to_destination: {
    method: string
    details: string
    cost: number
  }
  from_destination: {
    method: string
    details: string
    cost: number
  }
  local: {
    methods: string[]
    estimated_cost: number
  }
}

export interface CostBreakdown {
  accommodation: number
  transportation: number
  food: number
  attractions: number
  other: number
  total: number
}

// Expense types - 重新导出自 expense.ts 以避免重复定义
export type {
  Expense,
  ExpenseCategoryDB,
  ExpenseCategoryDisplay,
} from './expense'
export { categoryToDB, categoryToDisplay } from './expense'

// Trip planning form types
export interface TripFormData {
  origin?: string
  destination: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  budget: number
  travelers: number
  adult_count: number
  child_count: number
  preferences: string[]
  hotel_preferences?: string[] // 酒店偏好：经济型、中档、豪华等
  additional_notes?: string
  model?: AIModel
}

// Voice recognition types
export interface VoiceRecognitionResult {
  text: string
  confidence: number
  is_final: boolean
}

export interface VoiceParseResult {
  destination?: string
  origin?: string
  start_date?: string
  end_date?: string
  duration?: number
  budget?: number
  travelers?: number
  adult_count?: number
  child_count?: number
  preferences?: string[]
  hotel_preferences?: string[]
  additional_notes?: string
}

export interface VoiceParseResponse {
  success: boolean
  data?: VoiceParseResult
  raw_text?: string
  raw_ai_response?: string
  error?: string
  message?: string
}

export interface XFYunVoiceConfig {
  appId: string
  apiKey: string
  apiSecret?: string
}

export type VoiceMode = 'web' | 'xfyun'

// AI Model types
export type AIModel =
  | 'deepseek-chat'
  | 'deepseek-reasoner'
  | 'Qwen/Qwen2.5-72B-Instruct'

export interface AIModelConfig {
  id: AIModel
  name: string
  provider: 'anthropic' | 'deepseek' | 'modelscope'
  description: string
  maxTokens: number
  enabled: boolean
}

// Settings and Profile types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  theme: ThemeMode
  default_model?: AIModel
  default_budget?: number
  default_origin?: string
  created_at: string
  updated_at: string
}

// API Key types
export type ApiKeyService =
  | 'deepseek'
  | 'modelscope'
  | 'map'
  | 'voice'

export interface ApiKey {
  id: string
  user_id: string
  service: ApiKeyService
  key_name: string
  encrypted_key: string
  key_prefix: string
  base_url?: string | null          // API 基础 URL（用于自定义端点）
  extra_config?: string | null       // 额外配置 JSON（如 app_id, web_service_key 等）
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface ApiKeyDisplay {
  id: string
  service: ApiKeyService
  key_name: string
  key_prefix: string
  is_active: boolean
  last_used_at?: string
  created_at: string
}

export interface CreateApiKeyData {
  service: ApiKeyService
  key_name: string
  api_key: string
}

export interface UpdateApiKeyData {
  key_name?: string
  is_active?: boolean
}

// Password change types
export interface PasswordChangeData {
  current_password: string
  new_password: string
  confirm_password: string
}

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export interface PasswordRequirement {
  label: string
  met: boolean
}

// Settings form types
export interface ProfileUpdateData {
  name?: string
  avatar_url?: string
  theme?: ThemeMode
  default_model?: AIModel
  default_budget?: number
  default_origin?: string
}
