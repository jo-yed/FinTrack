export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  tags: string[];
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string;
  color: string;
  created_at: string;
}

export interface VaultItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  data: Record<string, string>;
  last_updated: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  created_at: string;
}

export type PageId = 'dashboard' | 'transactions' | 'vault' | 'goals';

export type Language = 'fr' | 'en';

export type Theme = 'light' | 'dark';
