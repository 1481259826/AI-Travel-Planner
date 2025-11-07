// API Configuration
export const config = {
  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // DeepSeek
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: 'deepseek-chat',
    maxTokens: 8000,
  },

  // ModelScope (Qwen)
  modelscope: {
    apiKey: process.env.MODELSCOPE_API_KEY || '',
    baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1/',
    model: 'Qwen/Qwen2.5-72B-Instruct',
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
    webServiceKey: process.env.AMAP_WEB_SERVICE_KEY || '', // Web服务API Key（后端使用）
  },

}

export default config
