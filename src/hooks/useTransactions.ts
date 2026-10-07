import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction, RecurrenceFrequency } from '../types';

function computeNextRecurrenceDate(fromDate: string, frequency: RecurrenceFrequency): string {
  const d = new Date(fromDate + 'T00:00:00');
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split('T')[0];
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTransactions((data || []) as Transaction[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const generateRecurringTransactions = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: dueTemplates, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .not('next_recurrence_date', 'is', null)
      .lte('next_recurrence_date', today);

    if (fetchErr || !dueTemplates || dueTemplates.length === 0) return;

    const newTransactions: Omit<Transaction, 'id' | 'user_id' | 'created_at'>[] = [];
    const templateUpdates: { id: string; next_recurrence_date: string }[] = [];

    for (const template of dueTemplates as Transaction[]) {
      if (!template.recurrence_frequency) continue;
      let currentNext = template.next_recurrence_date!;

      while (currentNext <= today) {
        newTransactions.push({
          account_id: template.account_id,
          type: template.type,
          category: template.category,
          amount: template.amount,
          description: template.description,
          date: currentNext,
          tags: template.tags,
          family_member_id: template.family_member_id,
          is_recurring: false,
          recurrence_frequency: null,
          recurrence_parent_id: template.id,
          next_recurrence_date: null,
        });
        currentNext = computeNextRecurrenceDate(currentNext, template.recurrence_frequency);
      }
      templateUpdates.push({ id: template.id, next_recurrence_date: currentNext });
    }

    if (newTransactions.length > 0) {
      const { error: insertErr } = await supabase.from('transactions').insert(newTransactions);
      if (insertErr) throw insertErr;
    }

    for (const update of templateUpdates) {
      await supabase
        .from('transactions')
        .update({ next_recurrence_date: update.next_recurrence_date })
        .eq('id', update.id);
    }

    if (newTransactions.length > 0) {
      await fetchTransactions();
    }
  }, [fetchTransactions]);

  useEffect(() => {
    generateRecurringTransactions().catch(console.error);
  }, [generateRecurringTransactions]);

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
    if (tx.is_recurring && tx.recurrence_frequency && tx.date) {
      tx.next_recurrence_date = computeNextRecurrenceDate(tx.date, tx.recurrence_frequency);
    }
    const { data, error } = await supabase
      .from('transactions')
      .insert(tx)
      .select()
      .single();
    if (error) throw error;
    setTransactions(prev => [data as Transaction, ...prev]);
    return data as Transaction;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (updates.is_recurring && updates.recurrence_frequency && updates.date) {
      updates.next_recurrence_date = computeNextRecurrenceDate(updates.date, updates.recurrence_frequency);
    }
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setTransactions(prev => prev.map(t => (t.id === id ? (data as Transaction) : t)));
    return data as Transaction;
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
