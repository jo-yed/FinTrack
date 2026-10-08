import { addPeriod, parseLocalDate } from './dates';
import type { Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'user_id' | 'created_at'>;

/** Garde-fou : une série très ancienne ne génère jamais plus de N occurrences d'un coup. */
export const MAX_OCCURRENCES_PER_TEMPLATE = 366;

export interface RecurrencePlan {
  /** Occurrences à créer (is_recurring = false, rattachées à leur modèle). */
  children: NewTransaction[];
  /** Nouvelle date d'échéance à enregistrer sur chaque modèle traité. */
  advances: { id: string; next: string }[];
}

/**
 * Calcule, pour chaque modèle de transaction récurrente arrivé à échéance, les occurrences
 * manquantes jusqu'à `today` (inclus) et la prochaine échéance.
 */
export function planRecurrences(templates: Transaction[], today: string): RecurrencePlan {
  const children: NewTransaction[] = [];
  const advances: { id: string; next: string }[] = [];

  for (const template of templates) {
    if (!template.is_recurring || !template.recurrence_frequency || !template.next_recurrence_date) continue;

    const anchorDay = parseLocalDate(template.date).getDate();
    let cursor = template.next_recurrence_date;
    let guard = 0;

    while (cursor <= today && guard < MAX_OCCURRENCES_PER_TEMPLATE) {
      children.push({
        account_id: template.account_id,
        type: template.type,
        category: template.category,
        amount: template.amount,
        description: template.description,
        date: cursor,
        tags: template.tags,
        family_member_id: template.family_member_id,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_parent_id: template.id,
        next_recurrence_date: null,
      });
      cursor = addPeriod(cursor, template.recurrence_frequency, anchorDay);
      guard++;
    }

    if (guard > 0) advances.push({ id: template.id, next: cursor });
  }

  return { children, advances };
}
