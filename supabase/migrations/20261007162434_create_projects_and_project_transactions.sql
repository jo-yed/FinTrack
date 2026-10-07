/*
# Create projects and project_transactions tables

## Overview
Adds a "project budgets" system — self-contained budget envelopes for specific
activities (travel, wedding, renovation, event, etc.). Each project has its own
income/expense tracking, balance, and progress. Projects are categorized as
"personal" or "family" to keep them visually and functionally separate from
the main family budget page.

## New Tables

1. **projects** — Budget envelopes for specific activities
   - id (uuid PK)
   - user_id (FK auth.users, ON DELETE CASCADE, DEFAULT auth.uid())
   - name (text) — e.g. "Vacances 2026", "Rénovation Cuisine"
   - description (text, optional)
   - scope (text) — 'personal' or 'family'
   - target_amount (numeric, default 0) — how much you want to save/spend
   - color (text) — for visual identification
   - icon (text) — lucide icon name for display
   - status (text) — 'active', 'completed', 'archived'
   - start_date (date, optional)
   - end_date (date, optional)
   - created_at (timestamptz)

2. **project_transactions** — Income/expense entries within a project
   - id (uuid PK)
   - project_id (FK projects, ON DELETE CASCADE)
   - user_id (FK auth.users, ON DELETE CASCADE, DEFAULT auth.uid())
   - type (text) — 'income' or 'expense'
   - label (text) — description of the entry
   - amount (numeric, > 0)
   - date (date)
   - created_at (timestamptz)

## Security
- RLS enabled on both tables
- Owner-scoped CRUD via auth.uid() = user_id
- project_transactions also scoped through parent project ownership
- user_id columns default to auth.uid() so inserts work without client passing it
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  scope text NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'family')),
  target_amount numeric DEFAULT 0,
  color text DEFAULT '#3B82F6',
  icon text DEFAULT 'FolderOpen',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Project transactions table
CREATE TABLE IF NOT EXISTS project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  label text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_tx" ON project_transactions;
CREATE POLICY "select_own_project_tx" ON project_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_project_tx" ON project_transactions;
CREATE POLICY "insert_own_project_tx" ON project_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_project_tx" ON project_transactions;
CREATE POLICY "update_own_project_tx" ON project_transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_project_tx" ON project_transactions;
CREATE POLICY "delete_own_project_tx" ON project_transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_scope ON projects(scope, status);
CREATE INDEX IF NOT EXISTS idx_project_tx_project_id ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tx_user_id ON project_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tx_date ON project_transactions(date DESC);
