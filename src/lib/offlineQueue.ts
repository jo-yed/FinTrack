import type { PaymentMethod } from '../types';

/** Écriture de dépense saisie hors ligne, en attente d'envoi. L'identifiant est généré côté client : rejouer l'envoi est sans danger. */
export interface QueuedEntry {
  id: string;
  user_id: string;
  project_id: string;
  category_id: string | null;
  type: 'expense';
  label: string;
  amount: number;
  date: string;
  payee: string;
  reference: string;
  payment_method: PaymentMethod;
  note: string;
  queuedAt: string;
}

const key = (userId: string) => `fintrack.offline.v1.${userId}`;

export function readQueue(userId: string): QueuedEntry[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeQueue(userId: string, queue: QueuedEntry[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), JSON.stringify(queue));
  } catch {
    /* stockage indisponible ou plein : la file reste en mémoire pour cette session */
  }
}

/** Erreur due au réseau (et non à une règle métier ou de sécurité) : on peut réessayer plus tard. */
export function isNetworkError(error: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(error?.message ?? '');
}
