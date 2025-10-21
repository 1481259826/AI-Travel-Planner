'use client'

import { AIModel, AIModelConfig } from '@/types'
import { availableModels } from '@/lib/models'

interface ModelSelectorProps {
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  className?: string
}

export default function ModelSelector({ selectedModel, onModelChange, className = '' }: ModelSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">AI 模型选择</label>
      <div className="grid grid-cols-1 gap-3">
        {availableModels.map((model: AIModelConfig) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onModelChange(model.id)}
            disabled={!model.enabled}
            className={`
              relative p-4 rounded-lg border-2 text-left transition-all
              ${selectedModel === model.id
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
              ${!model.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{model.name}</h3>
                  {selectedModel === model.id && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      已选择
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="capitalize">{model.provider}</span>
                  <span>•</span>
                  <span>最大 {model.maxTokens.toLocaleString()} tokens</span>
                </div>
              </div>
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${selectedModel === model.id
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
                }
              `}>
                {selectedModel === model.id && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
