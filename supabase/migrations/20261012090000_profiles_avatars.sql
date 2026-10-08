-- Profil utilisateur (photo) et avatars des membres de la famille (sexe, tranche d'age, teint).
-- Idempotent : peut etre rejoue sans effet.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS skin_tone smallint;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_gender_check') THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_gender_check CHECK (gender IS NULL OR gender IN ('f', 'm', 'x'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_age_group_check') THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_age_group_check CHECK (age_group IS NULL OR age_group IN ('child', 'teen', 'adult', 'senior'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_skin_tone_check') THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_skin_tone_check CHECK (skin_tone IS NULL OR skin_tone BETWEEN 0 AND 4);
  END IF;
END $$;

-- Photo de profil : petite image (redimensionnee par l'application), lisible uniquement par son proprietaire.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  photo text CHECK (
    photo IS NULL OR (length(photo) <= 60000 AND photo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')
  ),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_profile" ON user_profiles;
CREATE POLICY "delete_own_profile" ON user_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
