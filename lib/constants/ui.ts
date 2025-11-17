/**
 * UI 相关常量
 * 统一管理样式类名、颜色、尺寸等 UI 常量
 */

/**
 * 状态颜色映射
 */
export const STATUS_COLORS = {
  // 行程状态
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    badge: 'bg-gray-500',
  },
  planned: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    badge: 'bg-blue-500',
  },
  ongoing: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    badge: 'bg-green-500',
  },
  completed: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    badge: 'bg-purple-500',
  },
  // 预算状态
  under: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    badge: 'bg-green-500',
  },
  near: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    badge: 'bg-yellow-500',
  },
  over: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-500',
  },
} as const

/**
 * 预算级别颜色
 */
export const BUDGET_LEVEL_COLORS = {
  low: 'text-green-600',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  luxury: 'text-purple-600',
} as const

/**
 * 按钮样式
 */
export const BUTTON_STYLES = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
} as const

/**
 * 常用 padding/margin 尺寸
 */
export const SPACING = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
} as const

/**
 * 圆角尺寸
 */
export const BORDER_RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const

/**
 * 阴影样式
 */
export const SHADOW = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  none: 'shadow-none',
} as const

/**
 * 文字大小
 */
export const TEXT_SIZE = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
} as const

/**
 * 图标大小（lucide-react）
 */
export const ICON_SIZE = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

/**
 * Z-index 层级
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const
