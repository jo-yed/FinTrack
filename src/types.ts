export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
  created_at: string;
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  tags: string[];
  family_member_id: string | null;
  is_recurring: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_parent_id: string | null;
  next_recurrence_date: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string;
  color: string;
  created_at: string;
}

export interface VaultItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  data: Record<string, string>;
  last_updated: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  avatar_color: string;
  monthly_allowance: number;
  created_at: string;
}

export type PageId =
  | 'myspace'
  | 'admin'
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'reports'
  | 'family'
  | 'accounts'
  | 'activities'
  | 'vault'
  | 'goals'
  | 'settings';

export const PAGE_IDS: PageId[] = [
  'myspace', 'admin', 'dashboard', 'transactions', 'budgets', 'reports', 'family',
  'accounts', 'activities', 'vault', 'goals', 'settings',
];

/** personal/professional = budgets d'activités ; family = anciens projets familiaux (lecture/gestion conservées). */
export type ProjectScope = 'personal' | 'professional' | 'family';
export type ProjectStatus = 'active' | 'completed' | 'archived';

/** Budget d'activité (enveloppe) : fonds reçus, catégories créées par l'utilisateur, dépenses justifiées. */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  scope: ProjectScope;
  target_amount: number;
  color: string;
  icon: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  code: string;
  responsible: string;
  /** Si vrai, les dépenses saisies par un éditeur doivent être validées par le propriétaire. */
  requires_approval: boolean;
  owner_email: string;
  created_at: string;
}

/** Ligne (catégorie / activité) d'un budget, avec son montant prévu. */
export interface ProjectCategory {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  allocated_amount: number;
  color: string;
  sort_order: number;
  created_at: string;
}

export type PaymentMethod = '' | 'cash' | 'transfer' | 'cheque' | 'mobile_money' | 'card';

export type EntryStatus = 'pending' | 'approved' | 'rejected';
export type ProjectRole = 'owner' | 'editor' | 'viewer';

/** Écriture du journal d'un budget : income = fonds reçus (décaissement vers le budget), expense = dépense. */
export interface ProjectTransaction {
  id: string;
  project_id: string;
  user_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  label: string;
  amount: number;
  date: string;
  payee: string;
  reference: string;
  payment_method: PaymentMethod;
  note: string;
  source_transaction_id: string | null;
  status: EntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_by_email: string;
  created_at: string;
  /** Écriture saisie hors ligne, pas encore synchronisée (local uniquement). */
  offline?: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  email: string;
  role: Exclude<ProjectRole, 'owner'>;
  invited_by: string | null;
  created_at: string;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  entry_id: string;
  user_id: string;
  path: string;
  name: string;
  mime: string;
  size: number;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  project_id: string;
  entry_id: string | null;
  actor: string | null;
  actor_email: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface VaultSettings {
  user_id: string;
  salt: string;
  verifier: string;
  iterations: number;
  created_at: string;
}

export type Language = 'fr' | 'en';

export type Theme = 'light' | 'dark';

export type AccessStatus = 'requested' | 'active' | 'suspended' | 'rejected';

/** Accès d'un membre de famille (connexion par téléphone) validé par l'administrateur de sa famille. */
export interface FamilyAccess {
  id: string;
  owner_id: string | null;
  member_user_id: string;
  family_member_id: string | null;
  full_name: string;
  phone: string;
  login_email: string;
  request_code: string;
  status: AccessStatus;
  perm_add_expenses: boolean;
  perm_view_family: boolean;
  requested_at: string;
  approved_at: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string;
  phone: string;
  account_type: 'standard' | 'member';
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned: boolean;
  is_admin: boolean;
  budgets: number;
  transactions: number;
  access_status: AccessStatus | null;
  family_owner_email: string | null;
}

export interface AdminOverview {
  users: number;
  confirmed_users: number;
  banned_users: number;
  member_accounts: number;
  pending_requests: number;
  families: number;
  new_7d: number;
  new_30d: number;
  active_7d: number;
  budgets: number;
  entries: number;
  transactions: number;
  attachments: number;
  attachments_bytes: number;
  vaults: number;
}

export interface PlatformAuditEvent {
  id: string;
  actor: string | null;
  actor_email: string;
  action: string;
  target_id: string | null;
  target_label: string;
  details: Record<string, unknown>;
  created_at: string;
}
