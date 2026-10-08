/*
# Justificatifs, validation des dépenses, partage de budgets, historique

## 1. Partage (project_members)
Un budget peut être partagé par e-mail avec un « viewer » (lecture seule) ou un « editor » (saisie).
L'accès par e-mail n'est accordé que si l'adresse du compte est CONFIRMÉE (auth.users.email_confirmed_at),
afin que personne ne puisse s'approprier l'invitation d'un autre en s'inscrivant avec son adresse.
Les droits sont calculés par project_role() (SECURITY DEFINER, évite la récursion entre politiques RLS).

## 2. Validation des dépenses
- projects.requires_approval : si vrai, les écritures saisies par un editor sont « pending » jusqu'à décision du propriétaire.
- project_transactions.status : pending | approved | rejected, avec approved_by / approved_at / rejection_reason.
- Un trigger impose ces règles côté base (le client ne peut pas s'auto-approuver).

## 3. Justificatifs
- Bucket Storage privé « receipts » (images + PDF, 10 Mo max), chemin : <budget>/<écriture>/<fichier>.
- project_attachments : métadonnées des pièces jointes.
- Politiques Storage alignées sur les rôles du budget.

## 4. Historique (project_audit_log)
Journal alimenté par des triggers (non falsifiable par le client) : écritures, décisions, pièces jointes, partage, statut.
*/

-- ============================================================
-- Fonctions d'aide (SECURITY DEFINER : contournent la RLS, d'où l'absence de récursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.project_role(pid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  r text;
BEGIN
  IF auth.uid() IS NULL OR pid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid AND p.user_id = auth.uid()) THEN
    RETURN 'owner';
  END IF;

  SELECT m.role INTO r
  FROM public.project_members m
  WHERE m.project_id = pid
    AND lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL)
  LIMIT 1;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_requires_approval(pid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN coalesce((SELECT p.requires_approval FROM public.projects p WHERE p.id = pid), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.receipt_project_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN split_part(object_name, '/', 1)::uuid
  END
$$;

REVOKE ALL ON FUNCTION public.project_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_requires_approval(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_requires_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receipt_project_id(text) TO authenticated;

-- ============================================================
-- Colonnes ajoutées
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_email text NOT NULL DEFAULT coalesce(auth.jwt() ->> 'email', '');

ALTER TABLE project_transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by_email text NOT NULL DEFAULT coalesce(auth.jwt() ->> 'email', '');

ALTER TABLE project_transactions DROP CONSTRAINT IF EXISTS project_transactions_status_check;
ALTER TABLE project_transactions
  ADD CONSTRAINT project_transactions_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_project_tx_status ON project_transactions(project_id, status);

-- ============================================================
-- Partage
-- ============================================================

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  invited_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_members_project_email_unique ON project_members(project_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_project_members_email ON project_members(lower(email));

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (
    public.project_role(project_id) = 'owner'
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (public.project_role(project_id) = 'owner');

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated
  USING (public.project_role(project_id) = 'owner')
  WITH CHECK (public.project_role(project_id) = 'owner');

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (
    public.project_role(project_id) = 'owner'
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ============================================================
-- Politiques RLS fondées sur le rôle
-- ============================================================

-- projects : le propriétaire OU un membre peut lire (le propriétaire est testé directement
-- pour que INSERT ... RETURNING fonctionne : une fonction STABLE ne voit pas la ligne en cours d'insertion).
DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.project_role(id) IS NOT NULL);

-- project_categories : lecture pour tous les membres, écriture réservée au propriétaire (politiques existantes)
DROP POLICY IF EXISTS "select_own_project_categories" ON project_categories;
CREATE POLICY "select_own_project_categories" ON project_categories FOR SELECT
  TO authenticated USING (public.project_role(project_id) IS NOT NULL);

-- project_transactions
DROP POLICY IF EXISTS "select_own_project_tx" ON project_transactions;
CREATE POLICY "select_own_project_tx" ON project_transactions FOR SELECT
  TO authenticated USING (public.project_role(project_id) IS NOT NULL);

DROP POLICY IF EXISTS "insert_own_project_tx" ON project_transactions;
CREATE POLICY "insert_own_project_tx" ON project_transactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND public.project_role(project_id) IN ('owner', 'editor')
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_categories c
        WHERE c.id = project_transactions.category_id AND c.project_id = project_transactions.project_id
      )
    )
  );

DROP POLICY IF EXISTS "update_own_project_tx" ON project_transactions;
CREATE POLICY "update_own_project_tx" ON project_transactions FOR UPDATE
  TO authenticated
  USING (
    public.project_role(project_id) = 'owner'
    OR (
      public.project_role(project_id) = 'editor'
      AND user_id = auth.uid()
      AND (status <> 'approved' OR NOT public.project_requires_approval(project_id))
    )
  )
  WITH CHECK (
    (
      public.project_role(project_id) = 'owner'
      OR (public.project_role(project_id) = 'editor' AND user_id = auth.uid())
    )
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_categories c
        WHERE c.id = project_transactions.category_id AND c.project_id = project_transactions.project_id
      )
    )
  );

DROP POLICY IF EXISTS "delete_own_project_tx" ON project_transactions;
CREATE POLICY "delete_own_project_tx" ON project_transactions FOR DELETE
  TO authenticated USING (
    public.project_role(project_id) = 'owner'
    OR (
      public.project_role(project_id) = 'editor'
      AND user_id = auth.uid()
      AND (status <> 'approved' OR NOT public.project_requires_approval(project_id))
    )
  );

-- Règles de validation imposées côté base
CREATE OR REPLACE FUNCTION public.project_tx_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r text;
  req boolean;
BEGIN
  -- Opérations d'administration (migrations, service role) : aucune règle de rôle
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  r := public.project_role(NEW.project_id);
  req := public.project_requires_approval(NEW.project_id);

  IF TG_OP = 'INSERT' THEN
    NEW.created_by_email := coalesce(auth.jwt() ->> 'email', '');
    NEW.rejection_reason := '';
    IF r = 'owner' OR NOT req THEN
      NEW.status := 'approved';
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    ELSE
      NEW.status := 'pending';
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.project_id <> OLD.project_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'project_id et user_id ne sont pas modifiables';
  END IF;
  NEW.created_by_email := OLD.created_by_email;

  IF r = 'owner' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status IN ('approved', 'rejected') THEN
        NEW.approved_by := auth.uid();
        NEW.approved_at := now();
      ELSE
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
      END IF;
      IF NEW.status <> 'rejected' THEN
        NEW.rejection_reason := '';
      END IF;
    ELSE
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
      NEW.rejection_reason := OLD.rejection_reason;
    END IF;
  ELSE
    -- Un editor ne décide jamais : s'il modifie son écriture, elle repart en validation
    IF req THEN
      NEW.status := 'pending';
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
    END IF;
    NEW.rejection_reason := '';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_tx_guard ON project_transactions;
CREATE TRIGGER project_tx_guard
  BEFORE INSERT OR UPDATE ON project_transactions
  FOR EACH ROW EXECUTE FUNCTION public.project_tx_guard();

-- ============================================================
-- Justificatifs
-- ============================================================

CREATE TABLE IF NOT EXISTS project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES project_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL UNIQUE,
  name text NOT NULL,
  mime text NOT NULL DEFAULT '',
  size bigint NOT NULL DEFAULT 0 CHECK (size >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_entry ON project_attachments(entry_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON project_attachments(project_id);

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_attachments" ON project_attachments;
CREATE POLICY "select_project_attachments" ON project_attachments FOR SELECT
  TO authenticated USING (public.project_role(project_id) IS NOT NULL);

DROP POLICY IF EXISTS "insert_project_attachments" ON project_attachments;
CREATE POLICY "insert_project_attachments" ON project_attachments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND public.project_role(project_id) IN ('owner', 'editor')
    AND EXISTS (
      SELECT 1 FROM project_transactions e
      WHERE e.id = project_attachments.entry_id AND e.project_id = project_attachments.project_id
    )
  );

DROP POLICY IF EXISTS "delete_project_attachments" ON project_attachments;
CREATE POLICY "delete_project_attachments" ON project_attachments FOR DELETE
  TO authenticated USING (
    public.project_role(project_id) = 'owner'
    OR (public.project_role(project_id) = 'editor' AND user_id = auth.uid())
  );

-- Bucket privé : images et PDF, 10 Mo maximum
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
CREATE POLICY "receipts_select" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'receipts' AND public.project_role(public.receipt_project_id(name)) IS NOT NULL
  );

DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'receipts' AND public.project_role(public.receipt_project_id(name)) IN ('owner', 'editor')
  );

DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'receipts'
    AND (
      public.project_role(public.receipt_project_id(name)) = 'owner'
      OR (
        public.project_role(public.receipt_project_id(name)) = 'editor'
        AND owner_id = auth.uid()::text
      )
    )
  );

-- ============================================================
-- Historique (alimenté uniquement par des triggers)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  entry_id uuid,
  actor uuid,
  actor_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_audit_project ON project_audit_log(project_id, created_at DESC);

ALTER TABLE project_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_project_audit_log" ON project_audit_log;
CREATE POLICY "select_project_audit_log" ON project_audit_log FOR SELECT
  TO authenticated USING (public.project_role(project_id) IS NOT NULL);
-- Aucune politique INSERT/UPDATE/DELETE : seuls les triggers (SECURITY DEFINER) écrivent.

CREATE OR REPLACE FUNCTION public.log_project_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  eid uuid := NULL;
  act text;
  det jsonb := '{}'::jsonb;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN
    pid := NEW.id;
    IF NEW.requires_approval IS DISTINCT FROM OLD.requires_approval THEN
      act := 'approval_setting_changed';
      det := jsonb_build_object('requires_approval', NEW.requires_approval);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      act := 'status_changed';
      det := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE
      RETURN NULL;
    END IF;

  ELSIF TG_TABLE_NAME = 'project_transactions' THEN
    IF TG_OP = 'DELETE' THEN
      pid := OLD.project_id; eid := OLD.id;
      act := 'entry_deleted';
      det := jsonb_build_object('label', OLD.label, 'amount', OLD.amount, 'type', OLD.type);
    ELSIF TG_OP = 'INSERT' THEN
      pid := NEW.project_id; eid := NEW.id;
      act := 'entry_created';
      det := jsonb_build_object('label', NEW.label, 'amount', NEW.amount, 'type', NEW.type, 'status', NEW.status);
    ELSE
      pid := NEW.project_id; eid := NEW.id;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        act := 'entry_' || NEW.status;
        det := jsonb_build_object('label', NEW.label, 'amount', NEW.amount, 'reason', NEW.rejection_reason);
      ELSIF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.label IS DISTINCT FROM OLD.label
         OR NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.date IS DISTINCT FROM OLD.date
         OR NEW.type IS DISTINCT FROM OLD.type THEN
        act := 'entry_updated';
        det := jsonb_build_object('label', NEW.label, 'amount', NEW.amount, 'old_amount', OLD.amount, 'old_label', OLD.label);
      ELSE
        RETURN NULL;
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'project_attachments' THEN
    IF TG_OP = 'DELETE' THEN
      pid := OLD.project_id; eid := OLD.entry_id;
      act := 'attachment_removed';
      det := jsonb_build_object('name', OLD.name);
    ELSE
      pid := NEW.project_id; eid := NEW.entry_id;
      act := 'attachment_added';
      det := jsonb_build_object('name', NEW.name);
    END IF;

  ELSIF TG_TABLE_NAME = 'project_members' THEN
    IF TG_OP = 'DELETE' THEN
      pid := OLD.project_id;
      act := 'member_removed';
      det := jsonb_build_object('email', OLD.email);
    ELSIF TG_OP = 'INSERT' THEN
      pid := NEW.project_id;
      act := 'member_invited';
      det := jsonb_build_object('email', NEW.email, 'role', NEW.role);
    ELSE
      pid := NEW.project_id;
      act := 'member_role_changed';
      det := jsonb_build_object('email', NEW.email, 'role', NEW.role);
    END IF;
  END IF;

  -- Suppression en cascade d'un budget : plus rien à journaliser
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = pid) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.project_audit_log (project_id, entry_id, actor, actor_email, action, details)
  VALUES (pid, eid, auth.uid(), coalesce(auth.jwt() ->> 'email', ''), act, det);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_project_transactions ON project_transactions;
CREATE TRIGGER audit_project_transactions
  AFTER INSERT OR UPDATE OR DELETE ON project_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_project_event();

DROP TRIGGER IF EXISTS audit_project_attachments ON project_attachments;
CREATE TRIGGER audit_project_attachments
  AFTER INSERT OR DELETE ON project_attachments
  FOR EACH ROW EXECUTE FUNCTION public.log_project_event();

DROP TRIGGER IF EXISTS audit_project_members ON project_members;
CREATE TRIGGER audit_project_members
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW EXECUTE FUNCTION public.log_project_event();

DROP TRIGGER IF EXISTS audit_projects ON projects;
CREATE TRIGGER audit_projects
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_event();

-- Nettoyage du journal à la suppression d'un budget (nom en « zz » : s'exécute après les cascades)
CREATE OR REPLACE FUNCTION public.cleanup_project_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.project_audit_log WHERE project_id = OLD.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS zz_projects_audit_cleanup ON projects;
CREATE TRIGGER zz_projects_audit_cleanup
  AFTER DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_project_audit();
