'use client'

import { useEffect } from 'react'
import { useThemeStore, initializeTheme } from '@/lib/stores/theme-store'
import { supabase } from '@/lib/supabase'

/**
 * 主题提供者
 * 负责：
 * 1. 初始化主题系统
 * 2. 监听系统主题变化
 * 3. 从数据库加载用户主题偏好
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { loadThemeFromProfile } = useThemeStore()

  useEffect(() => {
    // 初始化主题系统（监听系统主题变化）
    const cleanup = initializeTheme()

    // 从数据库加载用户主题偏好
    async function loadUserTheme() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          const response = await fetch('/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const result = await response.json()
            const profile = result.data?.profile
            if (profile?.theme) {
              loadThemeFromProfile(profile.theme)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user theme:', error)
      }
    }

    loadUserTheme()

    return cleanup
  }, [loadThemeFromProfile])

  return <>{children}</>
}

/**
 * 全局 Providers
 * 组合所有需要的 Provider 组件
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}
