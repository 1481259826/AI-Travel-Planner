import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@/types'

interface ThemeState {
  theme: ThemeMode
  systemTheme: 'light' | 'dark'
  actualTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  setSystemTheme: (theme: 'light' | 'dark') => void
  loadThemeFromProfile: (theme: ThemeMode) => void
  saveThemeToProfile: (theme: ThemeMode) => Promise<void>
}

/**
 * 主题状态管理 Store
 * 支持 light / dark / system 三种模式
 * 自动监听系统主题变化
 * 持久化到 localStorage 和数据库
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      systemTheme: 'light',
      actualTheme: 'light',

      setTheme: (theme: ThemeMode) => {
        const { systemTheme } = get()
        const actualTheme = theme === 'system' ? systemTheme : theme

        set({ theme, actualTheme })

        // 更新 HTML class
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(actualTheme)
        }

        // 保存到数据库（异步，不阻塞 UI）
        get().saveThemeToProfile(theme).catch((error) => {
          console.error('Failed to save theme to profile:', error)
        })
      },

      setSystemTheme: (systemTheme: 'light' | 'dark') => {
        const { theme } = get()
        const actualTheme = theme === 'system' ? systemTheme : theme

        set({ systemTheme, actualTheme })

        // 如果当前是 system 模式，更新 HTML class
        if (theme === 'system' && typeof document !== 'undefined') {
          const root = document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(systemTheme)
        }
      },

      loadThemeFromProfile: (theme: ThemeMode) => {
        const { systemTheme } = get()
        const actualTheme = theme === 'system' ? systemTheme : theme

        set({ theme, actualTheme })

        // 更新 HTML class
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(actualTheme)
        }
      },

      saveThemeToProfile: async (theme: ThemeMode) => {
        try {
          const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme }),
          })

          if (!response.ok) {
            throw new Error('Failed to save theme')
          }
        } catch (error) {
          console.error('Error saving theme:', error)
          throw error
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

/**
 * 初始化主题系统
 * 监听系统主题变化，从数据库加载用户偏好
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return

  const store = useThemeStore.getState()

  // 获取系统主题
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const systemTheme = mediaQuery.matches ? 'dark' : 'light'
  store.setSystemTheme(systemTheme)

  // 监听系统主题变化
  const handleChange = (e: MediaQueryListEvent) => {
    const newSystemTheme = e.matches ? 'dark' : 'light'
    store.setSystemTheme(newSystemTheme)
  }

  mediaQuery.addEventListener('change', handleChange)

  // 返回清理函数
  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}
