import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface MissingApiKey {
  service: string
  displayName: string
  description: string
  isRequired: boolean
  configMethod: 'env' | 'user' | 'both'
  envKey?: string
}

export interface ApiKeyCheckResult {
  isChecking: boolean
  missingRequired: MissingApiKey[]
  missingOptional: MissingApiKey[]
  hasChecked: boolean
}

export function useApiKeyCheck(): ApiKeyCheckResult {
  const [isChecking, setIsChecking] = useState(true)
  const [missingRequired, setMissingRequired] = useState<MissingApiKey[]>([])
  const [missingOptional, setMissingOptional] = useState<MissingApiKey[]>([])
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    checkApiKeys()
  }, [])

  const checkApiKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsChecking(false)
        return
      }

      // 获取系统和用户的 API Keys
      const [systemResponse, userResponse] = await Promise.all([
        fetch('/api/user/api-keys/system', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
        fetch('/api/user/api-keys', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
      ])

      const systemResult = await systemResponse.json()
      const userResult = await userResponse.json()
      const systemKeys = systemResult.data?.systemKeys || systemResult.systemKeys || []
      const apiKeys = userResult.data?.apiKeys || []

      const missing: MissingApiKey[] = []

      // 检查必需的配置
      // 1. 高德地图后端 Web 服务 Key（必需）
      const hasBackendMapKey = systemKeys.some((k: any) =>
        k.service === 'map' && k.key_name.includes('后端')
      ) || apiKeys.some((k: any) => k.service === 'map' && k.is_active)

      if (!hasBackendMapKey) {
        missing.push({
          service: 'map',
          displayName: '高德地图 Web 服务',
          description: '用于地理编码、POI 搜索、获取景点照片等功能',
          isRequired: true,
          configMethod: 'both',
          envKey: 'AMAP_WEB_SERVICE_KEY',
        })
      }

      // 2. DeepSeek API Key（必需）
      const hasDeepSeekKey = systemKeys.some((k: any) => k.service === 'deepseek')
        || apiKeys.some((k: any) => k.service === 'deepseek' && k.is_active)

      if (!hasDeepSeekKey) {
        missing.push({
          service: 'deepseek',
          displayName: 'DeepSeek AI',
          description: '用于生成智能旅行规划和行程建议',
          isRequired: true,
          configMethod: 'both',
          envKey: 'DEEPSEEK_API_KEY',
        })
      }

      // 3. 科大讯飞语音 API（必需）
      const hasVoiceKey = systemKeys.some((k: any) => k.service === 'voice')
        || apiKeys.some((k: any) => k.service === 'voice' && k.is_active)

      if (!hasVoiceKey) {
        missing.push({
          service: 'voice',
          displayName: '科大讯飞语音',
          description: '用于语音输入和语音交互功能',
          isRequired: true,
          configMethod: 'both',
          envKey: 'VOICE_API_KEY',
        })
      }

      // 检查可选的配置
      const optional: MissingApiKey[] = []

      // ModelScope API Key（可选）
      const hasModelScopeKey = systemKeys.some((k: any) => k.service === 'modelscope')
        || apiKeys.some((k: any) => k.service === 'modelscope' && k.is_active)

      if (!hasModelScopeKey) {
        optional.push({
          service: 'modelscope',
          displayName: 'ModelScope (Qwen)',
          description: '提供 Qwen 系列模型支持，可作为 DeepSeek 的替代选择',
          isRequired: false,
          configMethod: 'both',
          envKey: 'MODELSCOPE_API_KEY',
        })
      }

      // 高德地图前端 Key 检查（必需，但只能在 .env.local 配置）
      const hasFrontendMapKey = systemKeys.some((k: any) =>
        k.service === 'map' && k.key_name.includes('前端')
      )

      if (!hasFrontendMapKey) {
        missing.push({
          service: 'map_frontend',
          displayName: '高德地图前端 JS API',
          description: '用于地图显示、路线规划等前端功能',
          isRequired: true,
          configMethod: 'env',
          envKey: 'NEXT_PUBLIC_MAP_API_KEY',
        })
      }

      setMissingRequired(missing)
      setMissingOptional(optional)
      setHasChecked(true)
    } catch (error) {
      console.error('API Key check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  return {
    isChecking,
    missingRequired,
    missingOptional,
    hasChecked,
  }
}
