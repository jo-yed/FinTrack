import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { VaultItem } from '../types';

export function useVaultItems() {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setVaultItems((data || []) as VaultItem[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVaultItems();
  }, [fetchVaultItems]);

  const addVaultItem = async (item: Omit<VaultItem, 'id' | 'user_id' | 'created_at' | 'last_updated'>) => {
    const { data, error } = await supabase
      .from('vault_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    setVaultItems(prev => [data as VaultItem, ...prev]);
    return data as VaultItem;
  };

  const updateVaultItem = async (id: string, updates: Partial<VaultItem>) => {
    const { data, error } = await supabase
      .from('vault_items')
      .update({ ...updates, last_updated: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setVaultItems(prev => prev.map(v => (v.id === id ? (data as VaultItem) : v)));
    return data as VaultItem;
  };

  const deleteVaultItem = async (id: string) => {
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (error) throw error;
    setVaultItems(prev => prev.filter(v => v.id !== id));
  };

  return {
    vaultItems,
    loading,
    error,
    refetch: fetchVaultItems,
    addVaultItem,
    updateVaultItem,
    deleteVaultItem,
  };
}
