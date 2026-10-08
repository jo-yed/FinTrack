import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { addPeriod, todayISO } from '../lib/dates';
import { planRecurrences } from '../lib/recurrence';
import type { NewTransaction } from '../lib/recurrence';
import type { Transaction } from '../types';

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addTransaction: (tx: NewTransaction) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

/**
 * Source de vérité unique des transactions (un seul chargement partagé par tous les écrans)
 * et unique point d'exécution de la génération des transactions récurrentes.
 */
export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generating = useRef(false);
  const lastGeneratedOn = useRef<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setTransactions((data || []) as Transaction[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  const generateRecurring = useCallback(async () => {
    const today = todayISO();
    if (generating.current || lastGeneratedOn.current === today) return;
    generating.current = true;
    try {
      const { data: due, error: fetchErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_recurring', true)
        .not('next_recurrence_date', 'is', null)
        .lte('next_recurrence_date', today);

      if (fetchErr) throw fetchErr;
      if (!due || due.length === 0) {
        lastGeneratedOn.current = today;
        return;
      }

      const { children, advances } = planRecurrences(due as Transaction[], today);

      if (children.length > 0) {
        // L'index unique (recurrence_parent_id, date) rend l'opération idempotente, même en concurrence.
        const { error: insertErr } = await supabase
          .from('transactions')
          .upsert(children, { onConflict: 'recurrence_parent_id,date', ignoreDuplicates: true });
        if (insertErr) throw insertErr;
      }

      for (const adv of advances) {
        const { error: updErr } = await supabase
          .from('transactions')
          .update({ next_recurrence_date: adv.next })
          .eq('id', adv.id);
        if (updErr) throw updErr;
      }

      lastGeneratedOn.current = today;
      if (children.length > 0) await refetch();
    } catch (err) {
      console.error('Génération des transactions récurrentes impossible :', err);
    } finally {
      generating.current = false;
    }
  }, [refetch]);

  useEffect(() => {
    refetch().then(generateRecurring);
  }, [refetch, generateRecurring]);

  // Session ouverte plusieurs jours : on re-vérifie au retour sur l'onglet.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') generateRecurring();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [generateRecurring]);

  const addTransaction = useCallback(async (tx: NewTransaction) => {
    const payload: NewTransaction = { ...tx };
    if (payload.is_recurring && payload.recurrence_frequency && payload.date) {
      payload.next_recurrence_date = addPeriod(payload.date, payload.recurrence_frequency);
    } else {
      payload.is_recurring = false;
      payload.recurrence_frequency = null;
      payload.next_recurrence_date = null;
    }
    const { data, error: err } = await supabase.from('transactions').insert(payload).select().single();
    if (err) throw err;
    setTransactions(prev => [data as Transaction, ...prev]);
    return data as Transaction;
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const current = transactions.find(t => t.id === id);
    const payload: Partial<Transaction> = { ...updates };

    const willBeRecurring = payload.is_recurring ?? current?.is_recurring ?? false;
    const frequency = payload.recurrence_frequency ?? current?.recurrence_frequency ?? null;
    const date = payload.date ?? current?.date;

    if (willBeRecurring && frequency && date) {
      const scheduleChanged =
        !current ||
        !current.is_recurring ||
        current.recurrence_frequency !== frequency ||
        current.date !== date ||
        !current.next_recurrence_date;
      if (scheduleChanged) payload.next_recurrence_date = addPeriod(date, frequency);
    } else if ('is_recurring' in payload) {
      payload.is_recurring = false;
      payload.recurrence_frequency = null;
      payload.next_recurrence_date = null;
    }

    const { data, error: err } = await supabase.from('transactions').update(payload).eq('id', id).select().single();
    if (err) throw err;
    setTransactions(prev => prev.map(t => (t.id === id ? (data as Transaction) : t)));
    return data as Transaction;
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id);
    if (err) throw err;
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ transactions, loading, error, refetch, addTransaction, updateTransaction, deleteTransaction }),
    [transactions, loading, error, refetch, addTransaction, updateTransaction, deleteTransaction],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export function useTransactions(): TransactionsContextType {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
