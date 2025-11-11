'use client'

import { useEffect, useState, useRef } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'

interface DayInfo {
  day: number
  date: string
}

interface ItineraryNavProps {
  days: DayInfo[]
  className?: string
}

export default function ItineraryNav({ days, className = '' }: ItineraryNavProps) {
  const [activeDay, setActiveDay] = useState<number>(1)
  const [isOpen, setIsOpen] = useState(false) // 移动端折叠状态
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // 创建 Intersection Observer 来监听哪个天数在可视区域
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // 找到当前可见的第一个 section
      const visibleEntry = entries.find(entry => entry.isIntersecting)

      if (visibleEntry) {
        const dayNumber = parseInt(visibleEntry.target.getAttribute('data-day') || '1')
        setActiveDay(dayNumber)
      }
    }

    observerRef.current = new IntersectionObserver(observerCallback, {
      rootMargin: '-20% 0px -70% 0px', // 当元素在视口上方30%时触发
      threshold: 0.1,
    })

    // 观察所有天数的卡片
    days.forEach(({ day }) => {
      const element = document.getElementById(`day-${day}`)
      if (element && observerRef.current) {
        observerRef.current.observe(element)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [days])

  const scrollToDay = (day: number) => {
    const element = document.getElementById(`day-${day}`)
    if (element) {
      // 平滑滚动到目标元素
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })

      // 移动端：点击后关闭导航
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* 桌面端：右侧浮动可折叠导航 */}
      <div className={`hidden lg:block fixed right-6 top-32 z-20 ${className}`}>
        <nav
          className={`transition-all duration-300 ${
            isOpen ? 'w-48' : 'w-12'
          }`}
          aria-label="行程导航"
        >
          {isOpen ? (
            // 展开状态
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">行程导航</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="收起导航"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                {days.map(({ day, date }) => (
                  <li key={day}>
                    <button
                      onClick={() => scrollToDay(day)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                        activeDay === day
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">第 {day} 天</div>
                      <div className={`text-xs ${
                        activeDay === day
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {date}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // 折叠状态：仅显示图标按钮
            <button
              onClick={() => setIsOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="展开行程导航"
              title="行程导航"
            >
              <Calendar className="w-6 h-6" />
            </button>
          )}
        </nav>
      </div>

      {/* 移动端：底部横向滚动导航 */}
      <div className="lg:hidden sticky top-16 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">快速跳转</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {days.map(({ day, date }) => (
              <button
                key={day}
                onClick={() => scrollToDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeDay === day
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className="font-medium text-sm">第 {day} 天</div>
                <div className={`text-xs whitespace-nowrap ${
                  activeDay === day
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {date}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
