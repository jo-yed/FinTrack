/*
# Create family_members table and add family_member_id to transactions

1. New Tables
- `family_members` — members of the user's family for per-person expense tracking
  - id, user_id, name, role, avatar_color, monthly_allowance, created_at
2. Modified Tables
- `transactions` — add nullable `family_member_id` column
3. Security
- RLS enabled on family_members, owner-scoped CRUD.
*/

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Autre',
  avatar_color text NOT NULL DEFAULT '#3B82F6',
  monthly_allowance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_family_members" ON family_members;
CREATE POLICY "select_own_family_members" ON family_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_family_members" ON family_members;
CREATE POLICY "insert_own_family_members" ON family_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_family_members" ON family_members;
CREATE POLICY "update_own_family_members" ON family_members FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_family_members" ON family_members;
CREATE POLICY "delete_own_family_members" ON family_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'family_member_id') THEN
    ALTER TABLE transactions ADD COLUMN family_member_id uuid;
  END IF;
END $$;
