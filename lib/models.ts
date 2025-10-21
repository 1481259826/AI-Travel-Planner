import { AIModelConfig } from '@/types'

// 可用的 AI 模型配置
export const availableModels: AIModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek 对话模型，中文支持优秀，推荐使用',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: '快速且经济的模型，适合日常使用',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: '平衡性能和成本',
    maxTokens: 8000,
    enabled: true,
  },
]

// 获取默认模型
export const getDefaultModel = (): AIModelConfig => {
  return availableModels[0]
}

// 根据 ID 获取模型配置
export const getModelById = (id: string): AIModelConfig | undefined => {
  return availableModels.find(model => model.id === id)
}
