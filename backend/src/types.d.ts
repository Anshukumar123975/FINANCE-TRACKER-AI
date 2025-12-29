/**
 * Global backend types (for editor IntelliSense)
 * These are TypeScript declarations but the runtime code is plain JS.
 */

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: number | null; // null for global categories
  name: string;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'income' | 'expense';
  category_id: number | null;
  merchant: string | null;
  description: string | null;
  date: string;
  receipt_url: string | null;
  created_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number | null;
  monthly_limit: number;
  month: string; // YYYY-MM
  created_at: string;
}

export interface Bill {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  due_date: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  paid: boolean;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  user_id: number;
  transaction_id: number | null;
  image_url: string;
  ocr_text: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_name: string | null;
  created_at: string;
}
