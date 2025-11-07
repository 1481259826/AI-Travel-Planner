import { AIModelConfig } from '@/types'

// 可用的 AI 模型配置
export const availableModels: AIModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek 对话模型，中文支持优秀',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    description: 'DeepSeek 推理模型，适合复杂逻辑推理',
    maxTokens: 8000,
    enabled: true,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen2.5 72B Instruct (ModelScope)',
    provider: 'modelscope',
    description: 'Qwen 2.5 72B 指令微调模型（ModelScope）',
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
