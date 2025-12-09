/**
 * Chat 组件模块
 * 统一导出所有对话相关组件
 */

export { ChatInput } from './ChatInput'
export { ChatSidebar } from './ChatSidebar'
export { MessageList } from './MessageList'
export { ToolCallCard } from './ToolCallCard'

// 对话式行程生成组件
export { default as TripFormCard } from './TripFormCard'
export { default as TripFormModal } from './TripFormModal'
export { default as TripGenerationProgress } from './TripGenerationProgress'
export { default as TripCompletionCard } from './TripCompletionCard'

// 对话式行程修改组件
export { default as ModificationPreviewCard } from './ModificationPreviewCard'

// 历史记录组件
export { HistoryItem } from './HistoryItem'
export { HistoryList } from './HistoryList'
export { HistoryTab } from './HistoryTab'
