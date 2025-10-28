'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '@/lib/stores/theme-store'
import type { ThemeMode } from '@/types'

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const themes: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'light', icon: <Sun className="w-4 h-4" />, label: '浅色' },
    { mode: 'dark', icon: <Moon className="w-4 h-4" />, label: '深色' },
    { mode: 'system', icon: <Monitor className="w-4 h-4" />, label: '跟随系统' },
  ]

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            theme === mode
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          title={label}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
