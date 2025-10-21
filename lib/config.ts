// API Configuration
export const config = {
  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Anthropic/Claude
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseURL: process.env.BASE_URL || 'https://api.anthropic.com',
    model: 'claude-haiku-4-5',
    maxTokens: 8000,  // 增加到 8000，避免长行程被截断
  },

  // DeepSeek
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: 'deepseek-chat',
    maxTokens: 8000,
  },

  // Voice Recognition
  voice: {
    apiKey: process.env.VOICE_API_KEY || '',
    appId: process.env.VOICE_APP_ID || '',
  },

  // Map Service
  map: {
    apiKey: process.env.NEXT_PUBLIC_MAP_API_KEY || '',
  },

  // Image Service
  unsplash: {
    accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  },
}

export default config
