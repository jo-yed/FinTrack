// Point d'entrée Deno (Supabase Edge Functions). Toute la logique est dans handler.ts (testée avec vitest).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handle } from './handler.ts';
import type { Deps } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
// Nouvelles clés (sb_secret_… / sb_publishable_…) en priorité ; anciennes clés JWT seulement en secours.
// Les secrets de fonction ne peuvent pas commencer par SUPABASE_, d'où le préfixe FINTRACK_.
const serviceKey = (Deno.env.get('FINTRACK_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;
const anonKey = (Deno.env.get('FINTRACK_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY'))!;
const pepper = Deno.env.get('FUNCTION_PEPPER') ?? 'fintrack';

// Origines autorisées : la production, plus d'éventuelles origines supplémentaires (variable ALLOWED_ORIGINS, séparées par des virgules)
const allowedOrigins = [
  'https://fin-track-theta-ten.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const deps: Deps = {
  allowedOrigins,

  async createAuthUser({ email, password, metadata }) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
    return { id: data?.user?.id ?? null, error: error ? { message: error.message, code: (error as { code?: string }).code } : null };
  },

  async updateAuthUser(id, attrs) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ...(attrs.password ? { password: attrs.password } : {}),
      ...(attrs.metadata ? { user_metadata: attrs.metadata } : {}),
    });
    return { error: error ? { message: error.message } : null };
  },

  async deleteAuthUser(id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    return { error: error ? { message: error.message } : null };
  },

  async getUser(token) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  },

  async rpc(name, args) {
    const { data, error } = await admin.rpc(name, args ?? {});
    return { data: (data ?? null) as never, error: error ? { message: error.message, code: error.code } : null };
  },

  async rpcAs(token, name, args) {
    const asUser = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await asUser.rpc(name, args ?? {});
    return { data: (data ?? null) as never, error: error ? { message: error.message, code: error.code } : null };
  },

  async getFamilyAccess(id) {
    const { data } = await admin
      .from('family_access')
      .select('id, owner_id, member_user_id, full_name, phone, status')
      .eq('id', id)
      .maybeSingle();
    return data ?? null;
  },

  async removeReceipts(paths) {
    await admin.storage.from('receipts').remove(paths);
  },

  randomPassword() {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('') + '7';
  },

  async hashKey(value) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pepper}:${value}`));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  },
};

Deno.serve(req => handle(req, deps));
