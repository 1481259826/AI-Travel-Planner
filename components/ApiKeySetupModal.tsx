'use client'

import { useState } from 'react'
import { X, AlertTriangle, CheckCircle, ExternalLink, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { MissingApiKey } from '@/hooks/useApiKeyCheck'

interface ApiKeySetupModalProps {
  isOpen: boolean
  onClose: () => void
  missingRequired: MissingApiKey[]
  missingOptional: MissingApiKey[]
}

export default function ApiKeySetupModal({
  isOpen,
  onClose,
  missingRequired,
  missingOptional,
}: ApiKeySetupModalProps) {
  const router = useRouter()
  const [showOptional, setShowOptional] = useState(false)

  if (!isOpen) return null

  const handleGoToSettings = () => {
    router.push('/dashboard/settings?tab=api-keys')
    onClose()
  }

  const handleSkip = () => {
    // 保存到 localStorage，避免每次都弹出
    localStorage.setItem('apiKeySetupSkipped', 'true')
    onClose()
  }

  const canSkip = missingRequired.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            {missingRequired.length > 0 ? (
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {missingRequired.length > 0 ? 'API 配置提醒' : '可选配置'}
            </h2>
          </div>
          {canSkip && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 欢迎信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              {missingRequired.length > 0 ? (
                <>
                  为了获得完整的功能体验，您需要配置以下 <strong>必需</strong> 的 API Keys。
                  这些配置只需设置一次，即可享受所有功能。
                </>
              ) : (
                <>
                  所有必需的 API 都已配置完成！以下是一些可选配置，可以进一步增强功能。
                </>
              )}
            </p>
          </div>

          {/* 必需配置 */}
          {missingRequired.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  必需配置 ({missingRequired.length})
                </h3>
              </div>

              <div className="space-y-3">
                {missingRequired.map((key) => (
                  <div
                    key={key.service}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-red-900 dark:text-red-300 mb-1">
                          {key.displayName}
                        </h4>
                        <p className="text-sm text-red-800 dark:text-red-400 mb-2">
                          {key.description}
                        </p>
                        <div className="text-xs text-red-700 dark:text-red-500">
                          {key.configMethod === 'env' && (
                            <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                              <strong>配置方式：</strong>在 <code>.env.local</code> 文件中配置{' '}
                              <code className="font-mono">{key.envKey}</code>，然后重启服务器
                            </div>
                          )}
                          {key.configMethod === 'user' && (
                            <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                              <strong>配置方式：</strong>在"设置 → API Key 管理"中添加
                            </div>
                          )}
                          {key.configMethod === 'both' && (
                            <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                              <strong>配置方式：</strong>
                              <br />
                              方式 1: 在 <code>.env.local</code> 文件中配置{' '}
                              <code className="font-mono">{key.envKey}</code>
                              <br />
                              方式 2: 在"设置 → API Key 管理"中添加（更灵活）
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 可选配置 */}
          {missingOptional.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    可选配置 ({missingOptional.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowOptional(!showOptional)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showOptional ? '隐藏' : '显示'}
                </button>
              </div>

              {showOptional && (
                <div className="space-y-3">
                  {missingOptional.map((key) => (
                    <div
                      key={key.service}
                      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {key.displayName}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {key.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 帮助信息 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-2">
              💡 获取 API Keys 帮助
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-400 space-y-1">
              <li>
                • <strong>高德地图</strong>：访问{' '}
                <a
                  href="https://lbs.amap.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-900 dark:text-amber-300 underline inline-flex items-center gap-1"
                >
                  高德开放平台 <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                • <strong>DeepSeek</strong>：访问{' '}
                <a
                  href="https://platform.deepseek.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-900 dark:text-amber-300 underline inline-flex items-center gap-1"
                >
                  DeepSeek Platform <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                • <strong>科大讯飞</strong>：访问{' '}
                <a
                  href="https://www.xfyun.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-900 dark:text-amber-300 underline inline-flex items-center gap-1"
                >
                  讯飞开放平台 <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                • 详细配置说明请查看项目根目录的 <code>.env.example</code> 文件
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700">
          {canSkip && (
            <Button variant="outline" onClick={handleSkip}>
              稍后配置
            </Button>
          )}
          <Button onClick={handleGoToSettings} className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            前往配置页面
          </Button>
        </div>
      </div>
    </div>
  )
}
