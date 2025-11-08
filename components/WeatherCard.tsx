'use client'

import { useState } from 'react'
import { Cloud, CloudRain, Sun, Wind, Droplets } from 'lucide-react'
import { WeatherDaily } from '@/types'
import { getWeatherAdvice } from '@/lib/amap-weather'
import Image from 'next/image'

/**
 * 获取天气图标 URL（使用emoji生成SVG）
 * @param weatherText 天气文本
 * @returns 图标 data URI
 */
function getWeatherIconUrl(weatherText: string): string {
  // 根据天气文本获取emoji
  let emoji = '🌤️' // 默认

  if (weatherText.includes('晴')) {
    emoji = '☀️'
  } else if (weatherText.includes('云') || weatherText.includes('阴')) {
    emoji = '☁️'
  } else if (weatherText.includes('雨')) {
    emoji = '🌧️'
  } else if (weatherText.includes('雪')) {
    emoji = '❄️'
  } else if (weatherText.includes('雷')) {
    emoji = '⛈️'
  } else if (weatherText.includes('雾') || weatherText.includes('霾')) {
    emoji = '🌫️'
  }

  // 生成包含emoji的SVG
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <text x="20" y="20" text-anchor="middle" dominant-baseline="central" font-size="32">
        ${emoji}
      </text>
    </svg>
  `

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

interface WeatherCardProps {
  date: string // 日期 YYYY-MM-DD
  weather: WeatherDaily | null
  isLoading?: boolean
}

/**
 * 天气卡片组件
 * 显示单日天气预报信息
 */
export default function WeatherCard({ date, weather, isLoading = false }: WeatherCardProps) {
  const [imageError, setImageError] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm text-blue-700 dark:text-blue-300">加载天气中...</span>
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
          <Cloud className="w-4 h-4 mr-2" />
          <span>暂无天气数据</span>
        </div>
      </div>
    )
  }

  // 获取天气建议
  const advice = getWeatherAdvice(weather.textDay)

  // 判断天气类型用于背景色
  const getWeatherGradient = () => {
    const text = weather.textDay.toLowerCase()
    if (text.includes('雨') || text.includes('rain')) {
      return 'from-gray-100 to-blue-100 dark:from-gray-800/50 dark:to-blue-900/20'
    } else if (text.includes('晴') || text.includes('sunny') || text.includes('clear')) {
      return 'from-orange-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20'
    } else if (text.includes('云') || text.includes('cloudy')) {
      return 'from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50'
    } else if (text.includes('雪') || text.includes('snow')) {
      return 'from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20'
    }
    return 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
  }

  return (
    <div className={`bg-gradient-to-br ${getWeatherGradient()} rounded-lg p-4 border border-blue-200 dark:border-blue-800/50 shadow-sm`}>
      <div className="flex items-start justify-between">
        {/* 左侧：温度和天气状况 */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* 天气图标 */}
            {!imageError ? (
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image
                  src={getWeatherIconUrl(weather.iconDay)}
                  alt={weather.textDay}
                  width={40}
                  height={40}
                  onError={() => setImageError(true)}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex-shrink-0">
                {weather.textDay.includes('雨') ? (
                  <CloudRain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                ) : weather.textDay.includes('晴') ? (
                  <Sun className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Cloud className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                )}
              </div>
            )}

            {/* 温度范围 */}
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {weather.tempMax}°
                <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">
                  / {weather.tempMin}°
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {weather.textDay}
              </div>
            </div>
          </div>

          {/* 天气建议 */}
          {advice && (
            <div className="mt-3 p-2 bg-white/50 dark:bg-gray-900/30 rounded text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">💡</span>
              <span>{advice}</span>
            </div>
          )}
        </div>

        {/* 右侧：详细信息 */}
        <div className="ml-4 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          {/* 风力 */}
          {weather.windDirDay && weather.windScaleDay && (
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{weather.windDirDay} {weather.windScaleDay}级</span>
            </div>
          )}

          {/* 湿度 */}
          {weather.humidity && (
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 flex-shrink-0" />
              <span>湿度 {weather.humidity}%</span>
            </div>
          )}

          {/* 降水量 */}
          {weather.precip && parseFloat(weather.precip) > 0 && (
            <div className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 flex-shrink-0" />
              <span>降水 {weather.precip}mm</span>
            </div>
          )}

          {/* 紫外线 */}
          {weather.uvIndex && (
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 flex-shrink-0" />
              <span>UV {weather.uvIndex}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
