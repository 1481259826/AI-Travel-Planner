'use client'

import { AlertCircle } from 'lucide-react'

interface ConfigurationWarningsProps {
  missingFrontendMapKey: boolean
  missingBackendMapKey: boolean
}

/**
 * API Key 配置警告组件
 * 显示缺失的关键配置警告
 */
export default function ConfigurationWarnings({
  missingFrontendMapKey,
  missingBackendMapKey
}: ConfigurationWarningsProps) {
  if (!missingFrontendMapKey && !missingBackendMapKey) {
    return null
  }

  return (
    <div className="space-y-3">
      {missingFrontendMapKey && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                ⚠️ 未配置高德地图前端 JS API Key
              </h4>
              <p className="text-sm text-red-800 dark:text-red-400">
                地图功能将无法使用。请在{' '}
                <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                  .env.local
                </code>{' '}
                文件中配置{' '}
                <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                  NEXT_PUBLIC_MAP_API_KEY
                </code>
                ，然后重启开发服务器。
              </p>
            </div>
          </div>
        </div>
      )}

      {missingBackendMapKey && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                ⚠️ 未配置高德地图 Web 服务 API Key
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                将影响以下功能：景点坐标准确度、景点真实照片获取、地理编码服务。
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-500">
                您可以：
                <br />
                1. 在下方"高德地图 Web 服务"区域点击"添加 Key"按钮配置
                <br />
                2. 或在{' '}
                <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                  .env.local
                </code>{' '}
                文件中配置{' '}
                <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                  AMAP_WEB_SERVICE_KEY
                </code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
