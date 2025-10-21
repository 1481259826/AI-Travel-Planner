'use client';

import { useState } from 'react';

// 费用类别映射
const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  accommodation: { label: '住宿', icon: '🏨', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  transportation: { label: '交通', icon: '🚗', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  food: { label: '餐饮', icon: '🍽️', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  attractions: { label: '景点', icon: '🎭', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
  shopping: { label: '购物', icon: '🛍️', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  other: { label: '其他', icon: '📝', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
};

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  budget: number;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export default function ExpenseList({
  expenses,
  budget,
  onDelete,
  onEdit,
}: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    date: '',
  });

  // 按类别分组
  const groupedExpenses = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = [];
    }
    acc[expense.category].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  // 计算总计
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget - totalExpenses;

  // 计算各类别支出
  const categoryTotals = Object.entries(groupedExpenses).map(([category, items]) => ({
    category,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    count: items.length,
  }));

  // 开始编辑
  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditForm({
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: expense.date,
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ amount: '', description: '', date: '' });
  };

  // 保存编辑
  const saveEdit = async (expense: Expense) => {
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      alert('请输入有效的金额');
      return;
    }

    const updatedExpense: Expense = {
      ...expense,
      amount: parseFloat(editForm.amount),
      description: editForm.description.trim() || null,
      date: editForm.date,
    };

    onEdit(updatedExpense);
    cancelEdit();
  };

  // 确认删除
  const confirmDelete = (id: string, description: string | null) => {
    if (window.confirm(`确定要删除这条费用记录吗？\n${description || '无备注'}`)) {
      onDelete(id);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">💰</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无费用记录
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          添加您的第一笔开支来开始追踪预算
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          费用总览
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">总支出</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ¥{totalExpenses.toFixed(2)}
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">剩余预算</div>
            <div className={`text-2xl font-bold ${
              remaining >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              ¥{remaining.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 分类统计 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            分类统计
          </h3>
          {categoryTotals.map(({ category, total, count }) => {
            const info = CATEGORY_INFO[category];
            const percentage = (total / totalExpenses) * 100;

            return (
              <div key={category} className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${info.color}`}>
                  {info.icon} {info.label}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 w-20 text-right">
                    ¥{total.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 w-12">
                    ({count}笔)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 费用列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            费用明细 ({expenses.length}笔)
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(groupedExpenses)
            .sort((a, b) => {
              const totalA = a[1].reduce((sum, item) => sum + item.amount, 0);
              const totalB = b[1].reduce((sum, item) => sum + item.amount, 0);
              return totalB - totalA;
            })
            .map(([category, items]) => {
              const info = CATEGORY_INFO[category];

              return (
                <div key={category}>
                  {/* 类别标题 */}
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${info.color}`}>
                        {info.icon} {info.label}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        ¥{items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* 费用项 */}
                  {items
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense) => (
                      <div
                        key={expense.id}
                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        {editingId === expense.id ? (
                          // 编辑模式
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="金额"
                              />
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="备注"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(expense)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                              >
                                保存
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 显示模式
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                  ¥{expense.amount.toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(expense.date).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                              {expense.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {expense.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(expense)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="编辑"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => confirmDelete(expense.id, expense.description)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="删除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
