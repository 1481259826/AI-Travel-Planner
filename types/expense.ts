export interface Expense {
  id: string;
  trip_id: string;
  category: 'accommodation' | 'transportation' | 'food' | 'attractions' | 'shopping' | 'other';
  amount: number;
  description: string | null;
  date: string; // ISO date string - 注意：数据库字段名是 'date'，不是 'expense_date'
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
}

// 数据库中的类别（英文）
export type ExpenseCategoryDB = 'accommodation' | 'transportation' | 'food' | 'attractions' | 'shopping' | 'other';

// 显示用的类别（中文）
export type ExpenseCategoryDisplay = '交通' | '住宿' | '餐饮' | '景点' | '购物' | '其他';

// 类别映射：中文 -> 英文
export const categoryToDB: Record<ExpenseCategoryDisplay, ExpenseCategoryDB> = {
  '交通': 'transportation',
  '住宿': 'accommodation',
  '餐饮': 'food',
  '景点': 'attractions',
  '购物': 'shopping',
  '其他': 'other',
};

// 类别映射：英文 -> 中文
export const categoryToDisplay: Record<ExpenseCategoryDB, ExpenseCategoryDisplay> = {
  'transportation': '交通',
  'accommodation': '住宿',
  'food': '餐饮',
  'attractions': '景点',
  'shopping': '购物',
  'other': '其他',
};
