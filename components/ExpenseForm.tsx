'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// 费用类别定义
const CATEGORIES = [
  { value: 'accommodation', label: '住宿', icon: '🏨' },
  { value: 'transportation', label: '交通', icon: '🚗' },
  { value: 'food', label: '餐饮', icon: '🍽️' },
  { value: 'attractions', label: '景点', icon: '🎭' },
  { value: 'shopping', label: '购物', icon: '🛍️' },
  { value: 'other', label: '其他', icon: '📝' },
];

interface ExpenseFormProps {
  tripId: string;
  budget: number;
  totalExpenses: number;
  onSuccess: () => void;
}

export default function ExpenseForm({
  tripId,
  budget,
  totalExpenses,
  onSuccess,
}: ExpenseFormProps) {
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 语音识别
  const startVoiceInput = (field: 'amount' | 'description') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('抱歉，您的浏览器不支持语音识别功能');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;

      if (field === 'amount') {
        // 尝试从语音中提取数字
        const numbers = transcript.match(/\d+(\.\d+)?/);
        if (numbers) {
          setAmount(numbers[0]);
        } else {
          // 尝试转换中文数字
          setAmount(transcript);
        }
      } else {
        setDescription(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      alert('语音识别失败，请重试');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效的金额');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          category,
          amount: parseFloat(amount),
          description: description.trim() || null,
          date,
        });

      if (error) throw error;

      // 重置表单
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);

      // 通知父组件刷新
      onSuccess();
    } catch (error: any) {
      alert(error.message || '创建费用记录失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算预算余额
  const remaining = budget - totalExpenses - (parseFloat(amount) || 0);
  const remainingPercentage = (remaining / budget) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        添加费用记录
      </h2>

      {/* 预算显示 */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">总预算</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ¥{budget.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">已花费</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ¥{totalExpenses.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">剩余预算</span>
          <span className={`font-semibold ${
            remainingPercentage > 20
              ? 'text-green-600 dark:text-green-400'
              : remainingPercentage > 0
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            ¥{remaining.toFixed(2)}
          </span>
        </div>
        {/* 进度条 */}
        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              remainingPercentage > 20
                ? 'bg-green-500'
                : remainingPercentage > 0
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, ((budget - remaining) / budget) * 100))}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 类别选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            费用类别
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  category === cat.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {cat.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 金额输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            金额（元）
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-12"
              required
            />
            <button
              type="button"
              onClick={() => startVoiceInput('amount')}
              disabled={isListening}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 disabled:text-red-500"
              title="语音输入金额"
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>
        </div>

        {/* 备注输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            备注（可选）
          </label>
          <div className="relative">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：午餐、出租车费..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-12"
            />
            <button
              type="button"
              onClick={() => startVoiceInput('description')}
              disabled={isListening}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 disabled:text-red-500"
              title="语音输入备注"
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>
        </div>

        {/* 日期选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            日期
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '添加中...' : '添加费用'}
        </button>
      </form>
    </div>
  );
}
