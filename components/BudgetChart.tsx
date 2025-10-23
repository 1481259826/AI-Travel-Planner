'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Expense } from '@/types/expense';
import {
  calculateBudgetStats,
  filterExpensesByDateRange,
  exportToCSV,
  exportToPDF,
  formatCurrency,
  BudgetStats,
} from '@/lib/analytics';

interface BudgetChartProps {
  expenses: Expense[];
  totalBudget: number;
  tripName: string;
}

export default function BudgetChart({ expenses, totalBudget, tripName }: BudgetChartProps) {
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [isExporting, setIsExporting] = useState(false);

  // 筛选后的费用数据
  const filteredExpenses = filterExpensesByDateRange(
    expenses,
    dateRange.start,
    dateRange.end
  );

  // 计算统计数据
  const stats: BudgetStats = calculateBudgetStats(filteredExpenses, totalBudget);

  // 处理CSV导出
  const handleExportCSV = () => {
    exportToCSV(filteredExpenses, tripName);
  };

  // 处理PDF导出
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(filteredExpenses, stats, tripName);
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert('导出PDF失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 自定义饼图标签
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部：标题和导出按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">费用数据分析</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            disabled={filteredExpenses.length === 0}
          >
            导出 CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            disabled={filteredExpenses.length === 0 || isExporting}
          >
            {isExporting ? '导出中...' : '导出 PDF'}
          </button>
        </div>
      </div>

      {/* 预算使用进度条 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">预算使用情况</h3>

        {/* 统计数字 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">总预算</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">已花费</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(stats.totalExpenses)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">剩余</p>
            <p
              className={`text-xl font-bold ${
                stats.isOverBudget ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(stats.remaining)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">使用率</p>
            <p
              className={`text-xl font-bold ${
                stats.usagePercentage > 100
                  ? 'text-red-600'
                  : stats.usagePercentage > 80
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {stats.usagePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 进度条 */}
        <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
              stats.usagePercentage > 100
                ? 'bg-red-600'
                : stats.usagePercentage > 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(stats.usagePercentage, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">
              {stats.usagePercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {stats.isOverBudget && (
          <p className="mt-4 text-sm text-red-600 font-medium">
            ⚠️ 已超出预算 {formatCurrency(Math.abs(stats.remaining))}
          </p>
        )}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 饼图：费用类别分布 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">费用类别分布</h3>
          {stats.categories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.categories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {stats.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* 图例 */}
              <div className="mt-4 space-y-2">
                {stats.categories.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-gray-700">{cat.category}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              暂无费用数据
            </div>
          )}
        </div>

        {/* 柱状图：每日开销对比 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">每日开销趋势</h3>
          {stats.dailyExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailyExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `¥${value}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Bar
                  dataKey="amount"
                  fill="#3b82f6"
                  name="金额"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              暂无每日开销数据
            </div>
          )}
        </div>
      </div>

      {/* 日期筛选（可选功能） */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">日期筛选</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              开始日期
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              结束日期
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateRange({})}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          当前显示 {filteredExpenses.length} 条费用记录
        </p>
      </div>
    </div>
  );
}
