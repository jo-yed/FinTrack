import { supabase } from './supabase';
import { callApi } from './api';
import type { AdminOverview, AdminUserRow, PlatformAuditEvent } from '../types';

/** Appels de la console d'administration. Chaque fonction SQL revérifie l'identité ET la double authentification. */

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

export async function fetchOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) fail(error);
  return data as AdminOverview;
}

export type UserFilter = 'all' | 'standard' | 'members' | 'pending' | 'banned' | 'unconfirmed';

export async function fetchUsers(search: string, filter: UserFilter, limit: number, offset: number): Promise<{ total: number; users: AdminUserRow[] }> {
  const { data, error } = await supabase.rpc('admin_list_users', { p_search: search, p_filter: filter, p_limit: limit, p_offset: offset });
  if (error) fail(error);
  return data as { total: number; users: AdminUserRow[] };
}

export async function setBanned(userId: string, banned: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_banned', { p_user: userId, p_banned: banned });
  if (error) fail(error);
}

export async function signOutUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_sign_out_user', { p_user: userId });
  if (error) fail(error);
}

export async function setAnnouncement(text: string, level: 'info' | 'warning' | 'critical'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_announcement', { p_text: text, p_level: level });
  if (error) fail(error);
}

export async function fetchAudit(limit = 100): Promise<PlatformAuditEvent[]> {
  const { data, error } = await supabase.rpc('admin_audit_list', { p_limit: limit });
  if (error) fail(error);
  return (data || []) as PlatformAuditEvent[];
}

export async function deleteUser(userId: string): Promise<void> {
  await callApi('admin_delete_user', { userId });
}
