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
      {/* 桌面端：固定侧边栏 */}
      <nav
        className={`hidden lg:block fixed left-4 top-32 z-20 ${className}`}
        aria-label="行程导航"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-48">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">行程导航</h3>
          </div>

          <ul className="space-y-1">
            {days.map(({ day, date }) => (
              <li key={day}>
                <button
                  onClick={() => scrollToDay(day)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
                    activeDay === day
                      ? 'bg-blue-600 text-white shadow-md scale-105'
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
      </nav>

      {/* 移动端：顶部可展开导航 */}
      <div className="lg:hidden sticky top-16 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          aria-expanded={isOpen}
          aria-label="展开行程导航"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                第 {activeDay} 天
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {days.find(d => d.day === activeDay)?.date}
              </div>
            </div>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {/* 展开的导航列表 */}
        {isOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <ul className="py-2">
              {days.map(({ day, date }) => (
                <li key={day}>
                  <button
                    onClick={() => scrollToDay(day)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeDay === day
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
        )}
      </div>
    </>
  )
}
