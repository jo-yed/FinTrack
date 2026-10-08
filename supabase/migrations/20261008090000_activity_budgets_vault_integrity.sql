/*
# Budgets d'activités (perso / pro), coffre chiffré, intégrité des données

## 1. Budgets d'activités (évolution des tables `projects` existantes — aucune donnée perdue)
- projects : scope accepte désormais 'professional' (en plus de 'personal' et 'family'),
  nouvelles colonnes `code` (n° / imputation budgétaire) et `responsible` (responsable du budget).
- project_categories (NOUVEAU) : catégories / activités créées librement par l'utilisateur dans un budget,
  avec montant prévu par ligne.
- project_transactions : nouvelles colonnes category_id, payee (bénéficiaire), reference (n° de pièce),
  payment_method, note, source_transaction_id (lien vers le décaissement fait depuis un compte).
  Les politiques RLS vérifient maintenant que le budget ET la catégorie appartiennent bien à l'utilisateur.

## 2. Coffre-fort chiffré côté client
- vault_settings (NOUVEAU) : sel PBKDF2 + « vérificateur » chiffré. Le mot de passe maître n'est jamais stocké.
  Les éléments de vault_items.data sont stockés sous la forme {"__enc": "<AES-GCM base64>"}.

## 3. Intégrité
- transactions : index unique (recurrence_parent_id, date) => impossible de générer deux fois la même
  occurrence d'une transaction récurrente (les doublons existants sont nettoyés avant).
- transactions.family_member_id : clé étrangère vers family_members (ON DELETE SET NULL),
  les références orphelines sont remises à NULL.
- categories : unicité (user_id, type, name).
*/

-- ============================================================
-- 1. Budgets d'activités
-- ============================================================

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_scope_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_scope_check CHECK (scope IN ('personal', 'professional', 'family'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS responsible text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_categories_project_name_unique
  ON project_categories(project_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_user_id ON project_categories(user_id);

ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_categories" ON project_categories;
CREATE POLICY "select_own_project_categories" ON project_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_project_categories" ON project_categories;
CREATE POLICY "insert_own_project_categories" ON project_categories FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_categories.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_project_categories" ON project_categories;
CREATE POLICY "update_own_project_categories" ON project_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_categories.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_project_categories" ON project_categories;
CREATE POLICY "delete_own_project_categories" ON project_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE project_transactions
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES project_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payee text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE project_transactions DROP CONSTRAINT IF EXISTS project_transactions_payment_method_check;
ALTER TABLE project_transactions
  ADD CONSTRAINT project_transactions_payment_method_check
  CHECK (payment_method IN ('', 'cash', 'transfer', 'cheque', 'mobile_money', 'card'));

CREATE INDEX IF NOT EXISTS idx_project_tx_category_id ON project_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_project_tx_source_tx ON project_transactions(source_transaction_id);

-- Les écritures doivent appartenir à un budget de l'utilisateur, et la catégorie au même budget.
DROP POLICY IF EXISTS "insert_own_project_tx" ON project_transactions;
CREATE POLICY "insert_own_project_tx" ON project_transactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_transactions.project_id AND p.user_id = auth.uid())
    AND (
      project_transactions.category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_categories c
        WHERE c.id = project_transactions.category_id
          AND c.project_id = project_transactions.project_id
          AND c.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "update_own_project_tx" ON project_transactions;
CREATE POLICY "update_own_project_tx" ON project_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_transactions.project_id AND p.user_id = auth.uid())
    AND (
      project_transactions.category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_categories c
        WHERE c.id = project_transactions.category_id
          AND c.project_id = project_transactions.project_id
          AND c.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 2. Coffre-fort chiffré côté client
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  salt text NOT NULL,
  verifier text NOT NULL,
  iterations integer NOT NULL DEFAULT 310000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vault_settings" ON vault_settings;
CREATE POLICY "select_own_vault_settings" ON vault_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_vault_settings" ON vault_settings;
CREATE POLICY "insert_own_vault_settings" ON vault_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vault_settings" ON vault_settings;
CREATE POLICY "update_own_vault_settings" ON vault_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_vault_settings" ON vault_settings;
CREATE POLICY "delete_own_vault_settings" ON vault_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. Intégrité des données
-- ============================================================

-- Nettoyage des doublons de transactions récurrentes générées (on garde une seule occurrence par date)
DELETE FROM transactions a
USING transactions b
WHERE a.recurrence_parent_id IS NOT NULL
  AND a.recurrence_parent_id = b.recurrence_parent_id
  AND a.date = b.date
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_recurrence_occurrence
  ON transactions(recurrence_parent_id, date);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family_member_id ON transactions(family_member_id);

-- family_member_id : références orphelines -> NULL, puis clé étrangère
UPDATE transactions t
SET family_member_id = NULL
WHERE t.family_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM family_members f WHERE f.id = t.family_member_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_family_member_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_family_member_id_fkey
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Catégories personnalisées : pas de doublon
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_type_name_unique
  ON categories(user_id, type, lower(name));
