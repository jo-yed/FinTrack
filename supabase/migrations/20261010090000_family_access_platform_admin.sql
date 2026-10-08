/*
# Accès famille (nom + téléphone), super administrateur de la plateforme, protections

## 1. Accès famille par téléphone
Un membre de la famille n'a pas besoin d'e-mail : il crée son accès avec son nom, son numéro de téléphone et un mot de passe.
Son compte reste SANS ACCÈS tant que l'administrateur de sa famille n'a pas validé sa demande :
 1. le membre reçoit un code de demande (ex. K7M2QX9R) et l'envoie à son administrateur de famille (WhatsApp, SMS…) ;
 2. l'administrateur saisit le code, vérifie le nom et le numéro, rattache la personne à un membre de sa famille
    et choisit précisément ses droits (saisir ses dépenses, voir tout le budget famille) ;
 3. l'accès est actif ; l'administrateur peut le suspendre, le modifier, le retirer ou réinitialiser le mot de passe.
Sécurité : tout passe par des fonctions SECURITY DEFINER (aucune écriture directe), les consultations de codes sont
limitées (20 par heure), un membre ne peut jamais valider une demande, et la RLS borne ce que chaque membre voit.

## 2. Super administrateur (plateforme)
- platform_admins : adresses e-mail autorisées (luc_boten@joyeds.com). L'identité exige une adresse CONFIRMÉE.
- Toutes les actions d'administration exigent en plus une authentification à deux facteurs (AAL2) tant que
  platform_settings.admin_requires_mfa est vrai (réglable uniquement en SQL, pour éviter tout blocage).
- Fonctions : statistiques, liste des comptes, suspension / réactivation (avec fermeture des sessions),
  annonce affichée à tous les utilisateurs, journal d'audit. La suppression d'un compte passe par la fonction
  Edge (elle doit aussi effacer les fichiers de stockage).
- L'administrateur gère les comptes et les accès ; il ne lit PAS les données financières privées des utilisateurs.

## 3. Protections
- rate_limits : limitation par clé (inscriptions par adresse IP, réinitialisations de mot de passe…).
*/

-- ============================================================
-- Journal / limites
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, hit_at DESC);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Vrai si l'action est autorisée (et la comptabilise) ; faux si la limite est atteinte.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key text, p_window interval, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.rate_limits WHERE hit_at < now() - interval '1 day';
  SELECT count(*) INTO n FROM public.rate_limits WHERE key = p_key AND hit_at > now() - p_window;
  IF n >= p_max THEN
    RETURN false;
  END IF;
  INSERT INTO public.rate_limits(key) VALUES (p_key);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, interval, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, interval, integer) TO service_role;

-- ============================================================
-- Accès famille
-- ============================================================

CREATE TABLE IF NOT EXISTS family_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  phone text NOT NULL CHECK (phone ~ '^[0-9]{8,15}$'),
  login_email text NOT NULL,
  request_code text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'active', 'suspended', 'rejected')),
  perm_add_expenses boolean NOT NULL DEFAULT false,
  perm_view_family boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT family_access_owner_required CHECK (status NOT IN ('active', 'suspended') OR owner_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS family_access_member_unique ON family_access(member_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS family_access_code_unique ON family_access(request_code);
CREATE INDEX IF NOT EXISTS idx_family_access_owner ON family_access(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_access_family_member ON family_access(family_member_id);

ALTER TABLE family_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_family_access" ON family_access;
CREATE POLICY "select_family_access" ON family_access FOR SELECT
  TO authenticated USING (owner_id = auth.uid() OR member_user_id = auth.uid());
-- Aucune politique INSERT / UPDATE / DELETE : uniquement les fonctions ci-dessous.

CREATE TABLE IF NOT EXISTS access_lookup_log (
  user_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_lookup_user ON access_lookup_log(user_id, at DESC);
ALTER TABLE access_lookup_log ENABLE ROW LEVEL SECURITY;

-- Code de demande : 8 caractères sans ambiguïté (pas de 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.gen_request_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
  i integer;
BEGIN
  FOR i IN 0..7 LOOP
    code := code || substr(alphabet, (get_byte(raw, i) % length(alphabet)) + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_member_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_access WHERE member_user_id = auth.uid())
$$;

-- Appelée uniquement par la fonction Edge (clé de service) juste après la création du compte du membre.
CREATE OR REPLACE FUNCTION public.register_member_request(p_user uuid, p_name text, p_phone text, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  tries integer := 0;
BEGIN
  LOOP
    code := public.gen_request_code();
    BEGIN
      INSERT INTO public.family_access (member_user_id, full_name, phone, login_email, request_code)
      VALUES (p_user, trim(p_name), p_phone, lower(p_email), code);
      RETURN code;
    EXCEPTION WHEN unique_violation THEN
      tries := tries + 1;
      IF tries > 5 OR EXISTS (SELECT 1 FROM public.family_access WHERE member_user_id = p_user) THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.register_member_request(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_member_request(uuid, text, text, text) TO service_role;

-- Un membre dont la demande a été refusée (ou dont la ligne a disparu) peut redemander l'accès.
CREATE OR REPLACE FUNCTION public.renew_access_request()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.family_access;
  meta jsonb;
  code text;
  mail text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT raw_user_meta_data, email INTO meta, mail FROM auth.users WHERE id = uid;
  IF coalesce(meta ->> 'account_type', '') <> 'member' THEN RAISE EXCEPTION 'forbidden'; END IF;

  code := public.gen_request_code();
  SELECT * INTO row FROM public.family_access WHERE member_user_id = uid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.family_access (member_user_id, full_name, phone, login_email, request_code)
    VALUES (uid, coalesce(meta ->> 'full_name', 'Membre'), coalesce(meta ->> 'phone', '00000000'), lower(mail), code);
  ELSIF row.status = 'rejected' THEN
    UPDATE public.family_access
       SET status = 'requested', owner_id = NULL, family_member_id = NULL, request_code = code,
           perm_add_expenses = false, perm_view_family = false, requested_at = now(), approved_at = NULL
     WHERE id = row.id;
  ELSE
    RAISE EXCEPTION 'not_renewable';
  END IF;

  RETURN code;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_access_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_access_request() TO authenticated;

-- Côté administrateur de famille : retrouver une demande à partir de son code (limité à 20 essais / heure)
CREATE OR REPLACE FUNCTION public.lookup_access_request(p_code text)
RETURNS TABLE (id uuid, full_name text, phone text, requested_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  n integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_member_account() THEN RAISE EXCEPTION 'forbidden'; END IF;

  DELETE FROM public.access_lookup_log WHERE at < now() - interval '1 day';
  SELECT count(*) INTO n FROM public.access_lookup_log l WHERE l.user_id = uid AND l.at > now() - interval '1 hour';
  IF n >= 20 THEN RAISE EXCEPTION 'too_many_attempts'; END IF;
  INSERT INTO public.access_lookup_log(user_id) VALUES (uid);

  RETURN QUERY
    SELECT fa.id, fa.full_name, fa.phone, fa.requested_at
    FROM public.family_access fa
    WHERE fa.request_code = clean AND fa.status = 'requested';
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_access_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_access_request(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_access_request(
  p_id uuid,
  p_family_member_id uuid,
  p_new_member_name text,
  p_add_expenses boolean,
  p_view_family boolean
)
RETURNS public.family_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.family_access;
  fm uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_member_account() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO req FROM public.family_access WHERE id = p_id AND status = 'requested' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;

  IF p_family_member_id IS NOT NULL THEN
    SELECT m.id INTO fm FROM public.family_members m WHERE m.id = p_family_member_id AND m.user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'member_not_found'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.family_access a
      WHERE a.family_member_id = fm AND a.status IN ('active', 'suspended') AND a.id <> req.id
    ) THEN
      RAISE EXCEPTION 'member_already_linked';
    END IF;
  ELSE
    INSERT INTO public.family_members (user_id, name, role, avatar_color, monthly_allowance)
    VALUES (auth.uid(), coalesce(nullif(trim(p_new_member_name), ''), req.full_name), 'Autre', '#3B82F6', 0)
    RETURNING id INTO fm;
  END IF;

  UPDATE public.family_access
     SET owner_id = auth.uid(), family_member_id = fm, status = 'active',
         perm_add_expenses = coalesce(p_add_expenses, false),
         perm_view_family = coalesce(p_view_family, false),
         approved_at = now()
   WHERE id = req.id
   RETURNING * INTO req;

  RETURN req;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_access_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_member_account() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.family_access SET status = 'rejected', owner_id = NULL, family_member_id = NULL
   WHERE id = p_id AND status = 'requested';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
END;
$$;

-- Droits d'un membre actif (ou suspension / réactivation)
CREATE OR REPLACE FUNCTION public.update_family_access(
  p_id uuid,
  p_add_expenses boolean,
  p_view_family boolean,
  p_status text
)
RETURNS public.family_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.family_access;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'invalid_status'; END IF;

  UPDATE public.family_access
     SET perm_add_expenses = coalesce(p_add_expenses, perm_add_expenses),
         perm_view_family = coalesce(p_view_family, perm_view_family),
         status = p_status
   WHERE id = p_id AND owner_id = auth.uid() AND status IN ('active', 'suspended')
   RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'access_not_found'; END IF;
  RETURN row;
END;
$$;

-- Retire définitivement l'accès (la personne peut redemander avec un nouveau code)
CREATE OR REPLACE FUNCTION public.revoke_family_access(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.family_access
     SET status = 'rejected', owner_id = NULL, family_member_id = NULL,
         perm_add_expenses = false, perm_view_family = false
   WHERE id = p_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'access_not_found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.is_member_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_access_request(uuid, uuid, text, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_access_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_family_access(uuid, boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_family_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_access_request(uuid, uuid, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_access_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_family_access(uuid, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_family_access(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Ce que voit et fait un membre de famille (RLS)
-- ------------------------------------------------------------

-- Transactions : le propriétaire voit tout ; un membre voit les siennes (et tout le budget famille si autorisé)
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_access fa
      WHERE fa.member_user_id = auth.uid()
        AND fa.status = 'active'
        AND fa.owner_id = transactions.user_id
        AND transactions.family_member_id IS NOT NULL -- les opérations personnelles de l'administrateur restent privées
        AND (fa.perm_view_family OR transactions.family_member_id = fa.family_member_id)
    )
  );

-- Un membre autorisé ne peut saisir que SES dépenses simples (ni compte, ni récurrence, ni revenu)
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR (
      type = 'expense'
      AND account_id IS NULL
      AND coalesce(is_recurring, false) = false
      AND recurrence_parent_id IS NULL
      AND family_member_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM family_access fa
        WHERE fa.member_user_id = auth.uid()
          AND fa.status = 'active'
          AND fa.perm_add_expenses
          AND fa.owner_id = transactions.user_id
          AND fa.family_member_id = transactions.family_member_id
      )
    )
  );

DROP POLICY IF EXISTS "select_own_family_members" ON family_members;
CREATE POLICY "select_own_family_members" ON family_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_access fa
      WHERE fa.member_user_id = auth.uid()
        AND fa.status = 'active'
        AND fa.owner_id = family_members.user_id
        AND (fa.perm_view_family OR family_members.id = fa.family_member_id)
    )
  );

-- ============================================================
-- Super administrateur
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY; -- aucune politique : accessible uniquement par les fonctions

INSERT INTO platform_admins (email) VALUES ('luc_boten@joyeds.com') ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  announcement text NOT NULL DEFAULT '' CHECK (char_length(announcement) <= 400),
  announcement_level text NOT NULL DEFAULT 'info' CHECK (announcement_level IN ('info', 'warning', 'critical')),
  admin_requires_mfa boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_platform_settings" ON platform_settings;
CREATE POLICY "select_platform_settings" ON platform_settings FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  actor_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  target_id uuid,
  target_label text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_log(created_at DESC);
ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY; -- lecture via admin_audit_list() uniquement

-- Identité administrateur : adresse autorisée ET confirmée
CREATE OR REPLACE FUNCTION public.is_admin_identity()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.platform_admins a ON a.email = lower(u.email)
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT jsonb_build_object(
    'is_admin', public.is_admin_identity(),
    'mfa_required', (SELECT admin_requires_mfa FROM public.platform_settings WHERE id),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1')
  )
$$;

-- Porte d'entrée de toutes les fonctions d'administration
CREATE OR REPLACE FUNCTION public.admin_gate()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_identity() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF (SELECT admin_requires_mfa FROM public.platform_settings WHERE id)
     AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'mfa_required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_platform_action(p_action text, p_target uuid, p_label text, p_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_log (actor, actor_email, action, target_id, target_label, details)
  VALUES (auth.uid(), coalesce(auth.jwt() ->> 'email', ''), p_action, p_target, coalesce(p_label, ''), coalesce(p_details, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public.admin_gate();
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM auth.users),
    'confirmed_users', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'banned_users', (SELECT count(*) FROM auth.users WHERE banned_until IS NOT NULL AND banned_until > now()),
    'member_accounts', (SELECT count(*) FROM auth.users WHERE raw_user_meta_data ->> 'account_type' = 'member'),
    'pending_requests', (SELECT count(*) FROM public.family_access WHERE status = 'requested'),
    'families', (SELECT count(DISTINCT owner_id) FROM public.family_access WHERE status IN ('active', 'suspended')),
    'new_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'active_7d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'budgets', (SELECT count(*) FROM public.projects),
    'entries', (SELECT count(*) FROM public.project_transactions),
    'transactions', (SELECT count(*) FROM public.transactions),
    'attachments', (SELECT count(*) FROM public.project_attachments),
    'attachments_bytes', (SELECT coalesce(sum(size), 0) FROM public.project_attachments),
    'vaults', (SELECT count(*) FROM public.vault_settings)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text, p_filter text, p_limit integer, p_offset integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  q text := '%' || lower(coalesce(trim(p_search), '')) || '%';
  lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  off integer := greatest(coalesce(p_offset, 0), 0);
  total integer;
  rows jsonb;
BEGIN
  PERFORM public.admin_gate();

  WITH base AS (
    SELECT
      u.id,
      CASE WHEN u.raw_user_meta_data ->> 'account_type' = 'member' THEN NULL ELSE u.email END AS email,
      coalesce(u.raw_user_meta_data ->> 'full_name', '') AS full_name,
      coalesce(u.raw_user_meta_data ->> 'phone', '') AS phone,
      coalesce(u.raw_user_meta_data ->> 'account_type', 'standard') AS account_type,
      u.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at IS NOT NULL) AS confirmed,
      (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
      EXISTS (SELECT 1 FROM public.platform_admins a WHERE a.email = lower(u.email)) AS is_admin,
      (SELECT count(*) FROM public.projects p WHERE p.user_id = u.id) AS budgets,
      (SELECT count(*) FROM public.transactions t WHERE t.user_id = u.id) AS transactions,
      (SELECT fa.status FROM public.family_access fa WHERE fa.member_user_id = u.id) AS access_status,
      (SELECT o.email FROM public.family_access fa JOIN auth.users o ON o.id = fa.owner_id WHERE fa.member_user_id = u.id) AS family_owner_email
    FROM auth.users u
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (lower(coalesce(b.email, '')) LIKE q OR lower(b.full_name) LIKE q OR b.phone LIKE q)
      AND CASE coalesce(p_filter, 'all')
            WHEN 'banned' THEN b.banned
            WHEN 'unconfirmed' THEN NOT b.confirmed
            WHEN 'members' THEN b.account_type = 'member'
            WHEN 'standard' THEN b.account_type <> 'member'
            WHEN 'pending' THEN b.access_status = 'requested'
            ELSE true
          END
  )
  SELECT (SELECT count(*) FROM filtered),
         coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC), '[]'::jsonb)
    INTO total, rows
  FROM (SELECT * FROM filtered ORDER BY created_at DESC LIMIT lim OFFSET off) f;

  RETURN jsonb_build_object('total', total, 'users', rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_banned(p_user uuid, p_banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_email text;
BEGIN
  PERFORM public.admin_gate();
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'cannot_target_self'; END IF;

  SELECT email INTO target_email FROM auth.users WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE email = lower(target_email)) THEN
    RAISE EXCEPTION 'cannot_target_admin';
  END IF;

  UPDATE auth.users SET banned_until = CASE WHEN p_banned THEN 'infinity'::timestamptz ELSE NULL END WHERE id = p_user;
  IF p_banned THEN
    DELETE FROM auth.sessions WHERE user_id = p_user; -- ferme immédiatement toutes ses sessions
  END IF;

  PERFORM public.log_platform_action(CASE WHEN p_banned THEN 'user_suspended' ELSE 'user_reactivated' END, p_user, coalesce(target_email, ''), '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_sign_out_user(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_email text;
BEGIN
  PERFORM public.admin_gate();
  SELECT email INTO target_email FROM auth.users WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  DELETE FROM auth.sessions WHERE user_id = p_user;
  PERFORM public.log_platform_action('user_signed_out', p_user, coalesce(target_email, ''), '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_announcement(p_text text, p_level text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_gate();
  IF p_level NOT IN ('info', 'warning', 'critical') THEN RAISE EXCEPTION 'invalid_level'; END IF;
  UPDATE public.platform_settings
     SET announcement = left(coalesce(trim(p_text), ''), 400), announcement_level = p_level, updated_at = now()
   WHERE id;
  PERFORM public.log_platform_action('announcement_changed', NULL, left(coalesce(p_text, ''), 80), jsonb_build_object('level', p_level));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_list(p_limit integer)
RETURNS SETOF public.platform_audit_log
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_gate();
  RETURN QUERY SELECT * FROM public.platform_audit_log ORDER BY created_at DESC LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END;
$$;

-- Réservé à la fonction Edge (clé de service) : chemins des justificatifs d'un utilisateur, pour les effacer avant la suppression du compte
CREATE OR REPLACE FUNCTION public.admin_user_receipt_paths(p_user uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT a.path FROM public.project_attachments a
  JOIN public.projects p ON p.id = a.project_id
  WHERE p.user_id = p_user
$$;

REVOKE ALL ON FUNCTION public.is_admin_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_admin_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_gate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_platform_action(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_banned(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_sign_out_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_announcement(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_audit_list(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_user_receipt_paths(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin_identity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_gate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sign_out_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_announcement(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_receipt_paths(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_platform_action(text, uuid, text, jsonb) TO service_role;

-- ============================================================
-- Fonctions réservées à la fonction Edge (clé de service)
-- ============================================================

-- Ferme toutes les sessions d'un utilisateur (ex. après réinitialisation de son mot de passe)
CREATE OR REPLACE FUNCTION public.purge_user_sessions(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  DELETE FROM auth.sessions WHERE user_id = p_user
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.platform_admins a ON a.email = lower(u.email) WHERE u.id = p_user
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_log_service(p_actor uuid, p_actor_email text, p_action text, p_target uuid, p_label text, p_details jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.platform_audit_log (actor, actor_email, action, target_id, target_label, details)
  VALUES (p_actor, coalesce(p_actor_email, ''), p_action, p_target, coalesce(p_label, ''), coalesce(p_details, '{}'::jsonb))
$$;

REVOKE ALL ON FUNCTION public.purge_user_sessions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_log_service(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_sessions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_log_service(uuid, text, text, uuid, text, jsonb) TO service_role;
