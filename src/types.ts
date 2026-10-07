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

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

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
  family_member_id: string | null;
  is_recurring: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_parent_id: string | null;
  next_recurrence_date: string | null;
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

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  avatar_color: string;
  monthly_allowance: number;
  created_at: string;
}

export type PageId = 'dashboard' | 'transactions' | 'budgets' | 'reports' | 'family' | 'accounts' | 'vault' | 'goals' | 'settings';

export type Language = 'fr' | 'en';

export type Theme = 'light' | 'dark';
