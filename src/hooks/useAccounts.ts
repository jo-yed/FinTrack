import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Account } from '../types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setAccounts((data || []) as Account[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (account: Omit<Account, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select()
      .single();
    if (error) throw error;
    setAccounts(prev => [...prev, data as Account]);
    return data as Account;
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setAccounts(prev => prev.map(a => (a.id === id ? (data as Account) : a)));
    return data as Account;
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
  };
}
