/*
# Create budgets table

1. New Tables
- `budgets` — monthly spending limits per category
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid())
  - `category` (text, not null)
  - `limit_amount` (numeric, not null)
  - `month` (text, not null) — YYYY-MM format
  - `created_at` (timestamptz, default now())
2. Security
- RLS enabled, owner-scoped CRUD.
3. Notes
- Unique constraint on (user_id, category, month).
*/

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  limit_amount numeric NOT NULL DEFAULT 0,
  month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_budgets" ON budgets;
CREATE POLICY "select_own_budgets" ON budgets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_budgets" ON budgets;
CREATE POLICY "insert_own_budgets" ON budgets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_budgets" ON budgets;
CREATE POLICY "update_own_budgets" ON budgets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_budgets" ON budgets;
CREATE POLICY "delete_own_budgets" ON budgets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_category_month_unique
  ON budgets(user_id, category, month);
