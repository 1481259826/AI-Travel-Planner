'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trip } from '@/types';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 辅助函数：格式化日期
function formatDate(date: Date, formatStr: string, options?: any) {
  return format(date, formatStr, options);
}

export default function PrintTripPage() {
  const params = useParams();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrip() {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('加载行程失败:', error);
        setLoading(false);
        return;
      }

      setTrip(data as Trip);
      setLoading(false);

      // 自动打开打印对话框
      setTimeout(() => {
        window.print();
      }, 500);
    }

    loadTrip();
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载行程中...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">行程不存在</p>
      </div>
    );
  }

  const days = trip.itinerary?.days || [];
  const accommodation = trip.itinerary?.accommodation || [];
  const transportation = trip.itinerary?.transportation;
  const estimatedCost = trip.itinerary?.estimated_cost;

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .page-break {
            page-break-before: always;
          }

          .avoid-break {
            page-break-inside: avoid;
          }
        }

        @media screen {
          body {
            background: #f3f4f6;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none my-8 print:my-0">
        {/* 封面页 */}
        <div className="p-12 text-center avoid-break">
          <h1 className="text-4xl font-bold text-blue-600 mb-6">
            {trip.destination} 之旅
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {formatDate(new Date(trip.start_date), 'yyyy年MM月dd日')} - {formatDate(new Date(trip.end_date), 'yyyy年MM月dd日')}
          </p>
          <p className="text-lg text-gray-500 mb-8">
            {Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}天 | {trip.travelers}人 | 预算 ¥{trip.budget?.toLocaleString() || '0'}
          </p>
          {trip.preferences && trip.preferences.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {trip.preferences.map((pref, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {pref}
                </span>
              ))}
            </div>
          )}
          <div className="mt-16 text-sm text-gray-400">
            <p>生成日期: {formatDate(new Date(), 'yyyy年MM月dd日')}</p>
          </div>
        </div>

        <div className="page-break"></div>

        {/* 行程概览 */}
        <div className="p-8 avoid-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-2">
            行程概览
          </h2>
          {trip.itinerary?.summary && (
            <p className="text-gray-700 mb-6 leading-relaxed">
              {trip.itinerary.summary}
            </p>
          )}
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold w-1/3">目的地</td>
                <td className="p-3">{trip.destination}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold">出发地</td>
                <td className="p-3">{(trip as any).origin || '未指定'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold">日期</td>
                <td className="p-3">
                  {formatDate(new Date(trip.start_date), 'yyyy年MM月dd日')} - {formatDate(new Date(trip.end_date), 'yyyy年MM月dd日')}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold">天数</td>
                <td className="p-3">
                  {Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} 天
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold">人数</td>
                <td className="p-3">{trip.travelers} 人</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-3 bg-gray-50 font-semibold">预算</td>
                <td className="p-3">¥{trip.budget?.toLocaleString() || '0'}</td>
              </tr>
              <tr>
                <td className="p-3 bg-gray-50 font-semibold">预估费用</td>
                <td className="p-3">
                  {estimatedCost?.total ? `¥${estimatedCost.total.toLocaleString()}` : '计算中'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 住宿信息 */}
        {accommodation.length > 0 && (
          <>
            <div className="page-break"></div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-2">
                住宿信息
              </h2>
              {accommodation.map((acc, idx) => (
                <div key={idx} className="mb-6 p-4 border border-gray-200 rounded avoid-break">
                  <h3 className="text-lg font-semibold text-blue-700 mb-2">
                    {idx + 1}. {acc.name}
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>类型: {acc.type}</p>
                    <p>地址: {acc.location?.address || '未指定'}</p>
                    <p>入住: {formatDate(new Date(acc.check_in), 'MM月dd日')}</p>
                    <p>退房: {formatDate(new Date(acc.check_out), 'MM月dd日')}</p>
                    <p>价格: ¥{acc.price_per_night || 0}/晚 × {Math.ceil((new Date(acc.check_out).getTime() - new Date(acc.check_in).getTime()) / (1000 * 60 * 60 * 24))}晚 = ¥{acc.total_price?.toLocaleString() || '0'}</p>
                    {acc.rating && <p>评分: {acc.rating}/5</p>}
                    {acc.amenities && acc.amenities.length > 0 && (
                      <p>设施: {acc.amenities.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 交通信息 */}
        {transportation && (
          <div className="p-8 avoid-break">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-2">
              交通信息
            </h2>
            {transportation.to_destination && (
              <div className="mb-4">
                <h3 className="font-semibold text-blue-700 mb-2">去程</h3>
                <p className="text-sm text-gray-700">方式: {transportation.to_destination.method}</p>
                <p className="text-sm text-gray-700">详情: {transportation.to_destination.details}</p>
                <p className="text-sm text-gray-700">费用: ¥{transportation.to_destination.cost?.toLocaleString() || '0'}</p>
              </div>
            )}
            {transportation.from_destination && (
              <div className="mb-4">
                <h3 className="font-semibold text-blue-700 mb-2">回程</h3>
                <p className="text-sm text-gray-700">方式: {transportation.from_destination.method}</p>
                <p className="text-sm text-gray-700">详情: {transportation.from_destination.details}</p>
                <p className="text-sm text-gray-700">费用: ¥{transportation.from_destination.cost?.toLocaleString() || '0'}</p>
              </div>
            )}
            {transportation.local && (
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">当地交通</h3>
                <p className="text-sm text-gray-700">方式: {transportation.local.methods?.join(', ') || '未指定'}</p>
                <p className="text-sm text-gray-700">预估费用: ¥{transportation.local.estimated_cost?.toLocaleString() || '0'}</p>
              </div>
            )}
          </div>
        )}

        {/* 每日行程 */}
        {days.length > 0 && (
          <>
            <div className="page-break"></div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-2">
                每日行程
              </h2>
              {days.map((day, idx) => (
                <div key={idx} className="mb-8 avoid-break">
                  <h3 className="text-xl font-semibold text-blue-700 mb-4">
                    第 {day.day} 天 - {formatDate(new Date(day.date), 'MM月dd日 (EEEE)', { locale: zhCN })}
                  </h3>

                  {/* 活动 */}
                  {day.activities && day.activities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">活动安排</h4>
                      {day.activities.map((activity, actIdx) => (
                        <div key={actIdx} className="mb-3 pl-4 border-l-2 border-blue-300">
                          <p className="text-sm font-semibold text-gray-900">
                            {activity.time} - {activity.name}
                          </p>
                          <p className="text-sm text-gray-700">{activity.description}</p>
                          <p className="text-xs text-gray-600">
                            📍 {activity.location?.name || '未指定'} | ⏱️ {activity.duration}
                            {activity.ticket_price ? ` | 门票 ¥${activity.ticket_price}` : ' | 免费'}
                          </p>
                          {activity.tips && (
                            <p className="text-xs text-orange-600 mt-1">💡 {activity.tips}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 餐饮 */}
                  {day.meals && day.meals.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">用餐推荐</h4>
                      {day.meals.map((meal, mealIdx) => (
                        <div key={mealIdx} className="mb-2 pl-4 border-l-2 border-green-300">
                          <p className="text-sm font-semibold text-gray-900">
                            {meal.time} - {meal.restaurant}
                          </p>
                          <p className="text-xs text-gray-600">
                            {meal.cuisine} | 人均 ¥{meal.avg_price || 0}
                          </p>
                          {meal.recommended_dishes && meal.recommended_dishes.length > 0 && (
                            <p className="text-xs text-gray-600">
                              推荐: {meal.recommended_dishes.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 费用预估 */}
        {estimatedCost && (
          <div className="p-8 avoid-break">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-2">
              费用预估
            </h2>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-3 text-left border border-gray-300">类别</th>
                  <th className="p-3 text-right border border-gray-300">金额</th>
                  <th className="p-3 text-right border border-gray-300">占比</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-3">住宿</td>
                  <td className="p-3 text-right">¥{estimatedCost.accommodation?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{estimatedCost.total ? ((estimatedCost.accommodation / estimatedCost.total) * 100).toFixed(1) : '0'}%</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3">交通</td>
                  <td className="p-3 text-right">¥{estimatedCost.transportation?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{estimatedCost.total ? ((estimatedCost.transportation / estimatedCost.total) * 100).toFixed(1) : '0'}%</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3">餐饮</td>
                  <td className="p-3 text-right">¥{estimatedCost.food?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{estimatedCost.total ? ((estimatedCost.food / estimatedCost.total) * 100).toFixed(1) : '0'}%</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3">景点门票</td>
                  <td className="p-3 text-right">¥{estimatedCost.attractions?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{estimatedCost.total ? ((estimatedCost.attractions / estimatedCost.total) * 100).toFixed(1) : '0'}%</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3">其他</td>
                  <td className="p-3 text-right">¥{estimatedCost.other?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">{estimatedCost.total ? ((estimatedCost.other / estimatedCost.total) * 100).toFixed(1) : '0'}%</td>
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-3">总计</td>
                  <td className="p-3 text-right">¥{estimatedCost.total?.toLocaleString() || '0'}</td>
                  <td className="p-3 text-right">100%</td>
                </tr>
              </tbody>
            </table>

            <div className="text-sm text-gray-700 space-y-1">
              <p>预算总额: ¥{trip.budget?.toLocaleString() || '0'}</p>
              <p>预估费用: ¥{estimatedCost.total?.toLocaleString() || '0'}</p>
              <p className={(trip.budget || 0) >= (estimatedCost.total || 0) ? 'text-green-600' : 'text-red-600'}>
                {(trip.budget || 0) >= (estimatedCost.total || 0)
                  ? `剩余预算: ¥${((trip.budget || 0) - (estimatedCost.total || 0)).toLocaleString()}`
                  : `超出预算: ¥${((estimatedCost.total || 0) - (trip.budget || 0)).toLocaleString()}`
                }
              </p>
              <p>预算使用率: {trip.budget ? (((estimatedCost.total || 0) / trip.budget) * 100).toFixed(1) : '0'}%</p>
            </div>
          </div>
        )}

        {/* 页脚 */}
        <div className="p-8 text-center text-sm text-gray-500 border-t border-gray-200">
          <p>由 AI Travel Planner 生成</p>
          <p className="mt-1">https://claude.com/claude-code</p>
        </div>
      </div>
    </>
  );
}
