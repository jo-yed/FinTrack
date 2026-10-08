/*
# Suspension d'un compte : durée de 100 ans au lieu de « infinity »

Le service d'authentification (GoTrue) ne sait pas lire une date « infinity » : la tentative de connexion d'un
compte suspendu provoquait une erreur 500. Une échéance lointaine (100 ans) a le même effet et renvoie un refus propre.
*/

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

  UPDATE auth.users
     SET banned_until = CASE WHEN p_banned THEN now() + interval '100 years' ELSE NULL END
   WHERE id = p_user;
  IF p_banned THEN
    DELETE FROM auth.sessions WHERE user_id = p_user; -- ferme immédiatement toutes ses sessions
  END IF;

  PERFORM public.log_platform_action(CASE WHEN p_banned THEN 'user_suspended' ELSE 'user_reactivated' END, p_user, coalesce(target_email, ''), '{}'::jsonb);
END;
$$;

-- Comptes éventuellement suspendus avec l'ancienne valeur
UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE banned_until = 'infinity'::timestamptz;
