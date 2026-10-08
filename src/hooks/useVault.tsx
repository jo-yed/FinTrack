import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  PBKDF2_ITERATIONS, checkVerifier, createVerifier, decryptJson, deriveKey, encryptJson, generateSalt,
} from '../lib/crypto';
import type { VaultItem, VaultSettings } from '../types';

export type VaultStatus = 'loading' | 'setup' | 'locked' | 'unlocked';

/** Délai d'inactivité avant verrouillage automatique du coffre. */
export const AUTO_LOCK_MS = 5 * 60 * 1000;

interface VaultRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  last_updated: string;
  created_at: string;
}

type ItemInput = { type: string; title: string; data: Record<string, string> };

interface VaultContextType {
  status: VaultStatus;
  items: VaultItem[];
  loading: boolean;
  setupVault: (password: string) => Promise<void>;
  /** Renvoie false si le mot de passe est incorrect. */
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  /** Supprime définitivement tous les éléments et le mot de passe maître (oubli du mot de passe). */
  resetVault: () => Promise<void>;
  addVaultItem: (item: ItemInput) => Promise<void>;
  updateVaultItem: (id: string, item: ItemInput) => Promise<void>;
  deleteVaultItem: (id: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const UNREADABLE: Record<string, string> = { '⚠': 'Données illisibles' };

function isEncrypted(data: Record<string, unknown>): data is { __enc: string } {
  return typeof data?.__enc === 'string';
}

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    supabase
      .from('vault_settings')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        setSettings((data as VaultSettings | null) ?? null);
        setStatus(data ? 'locked' : 'setup');
      });
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    setItems([]);
    setStatus(prev => (prev === 'unlocked' ? 'locked' : prev));
  }, []);

  // Verrouillage automatique après inactivité
  useEffect(() => {
    if (status !== 'unlocked') return;
    let timer = window.setTimeout(lock, AUTO_LOCK_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, AUTO_LOCK_MS);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [status, lock]);

  const loadItems = useCallback(async (key: CryptoKey) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .order('last_updated', { ascending: false });
    if (error) {
      setLoading(false);
      throw error;
    }

    const decrypted: VaultItem[] = [];
    for (const row of (data || []) as VaultRow[]) {
      let plain: Record<string, string>;
      if (isEncrypted(row.data)) {
        try {
          plain = await decryptJson<Record<string, string>>(key, row.data.__enc);
        } catch {
          plain = UNREADABLE;
        }
      } else {
        // Élément créé avant le chiffrement : on le chiffre immédiatement.
        plain = row.data as Record<string, string>;
        const __enc = await encryptJson(key, plain);
        await supabase.from('vault_items').update({ data: { __enc } }).eq('id', row.id);
      }
      decrypted.push({ ...row, data: plain });
    }
    setItems(decrypted);
    setLoading(false);
  }, []);

  const setupVault = useCallback(async (password: string) => {
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const verifier = await createVerifier(key);
    const { data, error } = await supabase
      .from('vault_settings')
      .insert({ salt, verifier, iterations: PBKDF2_ITERATIONS })
      .select()
      .single();
    if (error) throw error;
    setSettings(data as VaultSettings);
    keyRef.current = key;
    setStatus('unlocked');
    await loadItems(key); // chiffre les éventuels éléments hérités
  }, [loadItems]);

  const unlock = useCallback(async (password: string) => {
    if (!settings) return false;
    const key = await deriveKey(password, settings.salt, settings.iterations);
    if (!(await checkVerifier(key, settings.verifier))) return false;
    keyRef.current = key;
    setStatus('unlocked');
    await loadItems(key);
    return true;
  }, [settings, loadItems]);

  const addVaultItem = useCallback(async (item: ItemInput) => {
    const key = keyRef.current;
    if (!key) throw new Error('Coffre verrouillé');
    const __enc = await encryptJson(key, item.data);
    const { data, error } = await supabase
      .from('vault_items')
      .insert({ type: item.type, title: item.title, data: { __enc } })
      .select()
      .single();
    if (error) throw error;
    setItems(prev => [{ ...(data as VaultRow), data: item.data }, ...prev]);
  }, []);

  const updateVaultItem = useCallback(async (id: string, item: ItemInput) => {
    const key = keyRef.current;
    if (!key) throw new Error('Coffre verrouillé');
    const __enc = await encryptJson(key, item.data);
    const { data, error } = await supabase
      .from('vault_items')
      .update({ type: item.type, title: item.title, data: { __enc }, last_updated: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setItems(prev => prev.map(v => (v.id === id ? { ...(data as VaultRow), data: item.data } : v)));
  }, []);

  const deleteVaultItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (error) throw error;
    setItems(prev => prev.filter(v => v.id !== id));
  }, []);

  const changeMasterPassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!settings) return false;
    const oldKey = await deriveKey(oldPassword, settings.salt, settings.iterations);
    if (!(await checkVerifier(oldKey, settings.verifier))) return false;

    const salt = generateSalt();
    const newKey = await deriveKey(newPassword, salt);
    const verifier = await createVerifier(newKey);

    // On rechiffre d'abord tous les éléments, puis on remplace le vérificateur.
    for (const item of items) {
      const __enc = await encryptJson(newKey, item.data);
      const { error } = await supabase.from('vault_items').update({ data: { __enc } }).eq('id', item.id);
      if (error) throw error;
    }
    const { data, error } = await supabase
      .from('vault_settings')
      .update({ salt, verifier, iterations: PBKDF2_ITERATIONS })
      .eq('user_id', settings.user_id)
      .select()
      .single();
    if (error) throw error;
    setSettings(data as VaultSettings);
    keyRef.current = newKey;
    return true;
  }, [settings, items]);

  const resetVault = useCallback(async () => {
    const { error: itemsErr } = await supabase.from('vault_items').delete().not('id', 'is', null);
    if (itemsErr) throw itemsErr;
    const { error: setErr } = await supabase.from('vault_settings').delete().not('user_id', 'is', null);
    if (setErr) throw setErr;
    keyRef.current = null;
    setItems([]);
    setSettings(null);
    setStatus('setup');
  }, []);

  const value = useMemo(
    () => ({
      status, items, loading, setupVault, unlock, lock, changeMasterPassword, resetVault,
      addVaultItem, updateVaultItem, deleteVaultItem,
    }),
    [status, items, loading, setupVault, unlock, lock, changeMasterPassword, resetVault, addVaultItem, updateVaultItem, deleteVaultItem],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

export function useVault(): VaultContextType {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}
