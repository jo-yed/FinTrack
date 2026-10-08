import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Account } from '../types';

type NewAccount = Omit<Account, 'id' | 'user_id' | 'created_at'>;

interface AccountsContextType {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addAccount: (account: NewAccount) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export const AccountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setAccounts((data || []) as Account[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addAccount = useCallback(async (account: NewAccount) => {
    const { data, error: err } = await supabase.from('accounts').insert(account).select().single();
    if (err) throw err;
    setAccounts(prev => [...prev, data as Account]);
    return data as Account;
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    const { data, error: err } = await supabase.from('accounts').update(updates).eq('id', id).select().single();
    if (err) throw err;
    setAccounts(prev => prev.map(a => (a.id === id ? (data as Account) : a)));
    return data as Account;
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('accounts').delete().eq('id', id);
    if (err) throw err;
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({ accounts, loading, error, refetch, addAccount, updateAccount, deleteAccount }),
    [accounts, loading, error, refetch, addAccount, updateAccount, deleteAccount],
  );

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
};

export function useAccounts(): AccountsContextType {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error('useAccounts must be used within AccountsProvider');
  return ctx;
}
