// User types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created_at: string
}

// Trip types
export interface Trip {
  id: string
  user_id: string
  destination: string
  start_date: string
  end_date: string
  budget: number
  travelers: number
  preferences: string[]
  itinerary?: Itinerary
  status: 'draft' | 'planned' | 'ongoing' | 'completed'
  share_token?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Itinerary {
  days: DayPlan[]
  accommodation: Accommodation[]
  transportation: Transportation
  estimated_cost: CostBreakdown
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

// Expense types
export interface Expense {
  id: string
  trip_id: string
  category: 'accommodation' | 'transportation' | 'food' | 'attractions' | 'shopping' | 'other'
  amount: number
  description: string
  date: string
  created_at: string
  receipt_url?: string
}

// Trip planning form types
export interface TripFormData {
  origin: string
  destination: string
  start_date: string
  end_date: string
  budget: number
  travelers: number
  adult_count: number
  child_count: number
  preferences: string[]
  additional_notes?: string
  model?: AIModel
}

// Voice recognition types
export interface VoiceRecognitionResult {
  text: string
  confidence: number
  is_final: boolean
}

// AI Model types
export type AIModel = 'claude-haiku-4-5' | 'claude-3-5-sonnet-20241022' | 'deepseek-chat'

export interface AIModelConfig {
  id: AIModel
  name: string
  provider: 'anthropic' | 'deepseek'
  description: string
  maxTokens: number
  enabled: boolean
}
