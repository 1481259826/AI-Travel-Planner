import { Expense, categoryToDisplay, type ExpenseCategoryDB } from '@/types/expense';

// 费用类别聚合数据
export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// 每日开销数据
export interface DailyExpense {
  date: string;
  amount: number;
  count: number;
}

// 预算统计数据
export interface BudgetStats {
  totalExpenses: number;
  totalBudget: number;
  remaining: number;
  usagePercentage: number;
  categories: CategoryData[];
  dailyExpenses: DailyExpense[];
  isOverBudget: boolean;
}

// 类别颜色映射
const CATEGORY_COLORS: Record<string, string> = {
  '交通': '#3b82f6', // blue-500
  '住宿': '#10b981', // green-500
  '餐饮': '#f59e0b', // amber-500
  '景点': '#8b5cf6', // purple-500
  '购物': '#ec4899', // pink-500
  '其他': '#6b7280', // gray-500
};

/**
 * 按类别聚合费用数据
 */
export function aggregateByCategory(expenses: Expense[]): CategoryData[] {
  const categoryMap = new Map<string, number>();

  // 聚合每个类别的总金额（将英文类别转换为中文显示）
  expenses.forEach(expense => {
    // 将数据库中的英文类别转换为中文显示
    const displayCategory = categoryToDisplay[expense.category as ExpenseCategoryDB] || '其他';
    const current = categoryMap.get(displayCategory) || 0;
    categoryMap.set(displayCategory, current + expense.amount);
  });

  // 计算总金额
  const totalAmount = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);

  // 转换为数组并计算百分比
  const categories: CategoryData[] = Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    color: CATEGORY_COLORS[category] || CATEGORY_COLORS['其他'],
  }));

  // 按金额降序排序
  return categories.sort((a, b) => b.amount - a.amount);
}

/**
 * 按日期聚合费用数据
 */
export function aggregateByDate(expenses: Expense[]): DailyExpense[] {
  const dateMap = new Map<string, { amount: number; count: number }>();

  expenses.forEach(expense => {
    const date = new Date(expense.date).toLocaleDateString('zh-CN');
    const current = dateMap.get(date) || { amount: 0, count: 0 };
    dateMap.set(date, {
      amount: current.amount + expense.amount,
      count: current.count + 1,
    });
  });

  // 转换为数组并排序
  const dailyExpenses: DailyExpense[] = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return dailyExpenses;
}

/**
 * 计算预算统计数据
 */
export function calculateBudgetStats(
  expenses: Expense[],
  totalBudget: number
): BudgetStats {
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = totalBudget - totalExpenses;
  const usagePercentage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  return {
    totalExpenses,
    totalBudget,
    remaining,
    usagePercentage,
    categories: aggregateByCategory(expenses),
    dailyExpenses: aggregateByDate(expenses),
    isOverBudget: totalExpenses > totalBudget,
  };
}

/**
 * 按日期范围筛选费用
 */
export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate?: Date,
  endDate?: Date
): Expense[] {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);

    if (startDate && expenseDate < startDate) return false;
    if (endDate && expenseDate > endDate) return false;

    return true;
  });
}

/**
 * 导出为 CSV 格式
 */
export function exportToCSV(expenses: Expense[], tripName: string): void {
  const headers = ['日期', '类别', '描述', '金额'];
  const rows = expenses.map(expense => [
    new Date(expense.date).toLocaleDateString('zh-CN'),
    categoryToDisplay[expense.category as ExpenseCategoryDB] || expense.category,
    expense.description || '',
    expense.amount.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${tripName}_expenses_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 导出为 PDF 格式
 */
export async function exportToPDF(
  expenses: Expense[],
  stats: BudgetStats,
  tripName: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  // 添加中文字体支持（使用默认字体）
  doc.setFont('helvetica');

  // 标题
  doc.setFontSize(18);
  doc.text(tripName + ' - Expense Report', 20, 20);

  // 预算摘要
  doc.setFontSize(12);
  doc.text('Budget Summary', 20, 35);
  doc.setFontSize(10);
  doc.text(`Total Budget: ${stats.totalBudget.toFixed(2)} CNY`, 20, 45);
  doc.text(`Total Expenses: ${stats.totalExpenses.toFixed(2)} CNY`, 20, 52);
  doc.text(`Remaining: ${stats.remaining.toFixed(2)} CNY`, 20, 59);
  doc.text(`Usage: ${stats.usagePercentage.toFixed(1)}%`, 20, 66);

  // 类别统计表格
  autoTable(doc, {
    startY: 75,
    head: [['Category', 'Amount (CNY)', 'Percentage']],
    body: stats.categories.map(cat => [
      cat.category,
      cat.amount.toFixed(2),
      cat.percentage.toFixed(1) + '%',
    ]),
    theme: 'grid',
  });

  // 费用明细表格
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Date', 'Category', 'Description', 'Amount (CNY)']],
    body: expenses.map(expense => [
      new Date(expense.date).toLocaleDateString('zh-CN'),
      categoryToDisplay[expense.category as ExpenseCategoryDB] || expense.category,
      expense.description || '',
      expense.amount.toFixed(2),
    ]),
    theme: 'striped',
  });

  // 保存 PDF
  doc.save(`${tripName}_expense_report_${Date.now()}.pdf`);
}

/**
 * 格式化货币
 */
export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * 获取类别颜色
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['其他'];
}
