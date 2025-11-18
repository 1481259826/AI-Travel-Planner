'use client'

import { AIModel, AIModelConfig } from '@/types'
import { AI_MODELS, getModelById } from '@/lib/config'

interface ModelSelectorProps {
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  className?: string
}

export default function ModelSelector({ selectedModel, onModelChange, className = '' }: ModelSelectorProps) {
  const currentModel = getModelById(selectedModel)

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="model-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        AI 模型选择
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as AIModel)}
        className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {AI_MODELS.map((model: AIModelConfig) => (
          <option
            key={model.id}
            value={model.id}
            disabled={!model.enabled}
          >
            {model.name} - {model.description}
          </option>
        ))}
      </select>

      {/* 显示当前选中模型的额外信息 */}
      {currentModel && (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="capitalize font-medium">{currentModel.provider}</span>
          <span>•</span>
          <span>最大 {currentModel.maxTokens.toLocaleString()} tokens</span>
        </div>
      )}
    </div>
  )
}
