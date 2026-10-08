/**
 * Logique de la fonction serveur « fintrack-api » (sans dépendance Deno : testable avec vitest).
 *
 * Actions :
 *  - member_register        (public)  : un membre de famille crée son accès avec nom + téléphone + mot de passe.
 *  - member_reset_password  (connecté): l'administrateur de la famille (ou le super admin) génère un mot de passe provisoire.
 *  - admin_delete_user      (super admin, 2 facteurs) : supprime un compte ET ses fichiers.
 *
 * Sécurité : origines autorisées (CORS), corps limité, validations strictes, limitation par IP/numéro/utilisateur,
 * messages d'erreur génériques, aucune information interne exposée.
 */
import { normalizePhone, phoneToEmail } from './phone.ts';

export interface RpcResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface AuthUserLite {
  id: string;
  email: string | null;
}

export interface Deps {
  /** Origines autorisées à appeler la fonction depuis un navigateur. */
  allowedOrigins: string[];
  createAuthUser(args: { email: string; password: string; metadata: Record<string, unknown> }): Promise<{ id: string | null; error: { message: string; code?: string } | null }>;
  updateAuthUser(id: string, attrs: { password?: string; metadata?: Record<string, unknown> }): Promise<{ error: { message: string } | null }>;
  deleteAuthUser(id: string): Promise<{ error: { message: string } | null }>;
  /** Vérifie un jeton d'accès et renvoie l'utilisateur correspondant (ou null). */
  getUser(token: string): Promise<AuthUserLite | null>;
  /** Appel d'une fonction SQL avec la clé de service. */
  rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<RpcResult<T>>;
  /** Appel d'une fonction SQL AVEC l'identité de l'appelant (auth.uid(), aal… évalués par la base). */
  rpcAs<T = unknown>(token: string, name: string, args?: Record<string, unknown>): Promise<RpcResult<T>>;
  getFamilyAccess(id: string): Promise<{ id: string; owner_id: string | null; member_user_id: string; full_name: string; phone: string; status: string } | null>;
  removeReceipts(paths: string[]): Promise<void>;
  randomPassword(): string;
  hashKey(value: string): Promise<string>;
}

const MAX_BODY_BYTES = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors },
  });
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function limit(deps: Deps, key: string, windowSql: string, max: number): Promise<void> {
  const { data, error } = await deps.rpc<boolean>('rate_limit_hit', { p_key: await deps.hashKey(key), p_window: windowSql, p_max: max });
  if (error) throw new HttpError(500, 'server_error');
  if (data === false) throw new HttpError(429, 'too_many_requests');
}

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

async function requireUser(req: Request, deps: Deps): Promise<{ token: string; user: AuthUserLite }> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'unauthorized');
  const user = await deps.getUser(token);
  if (!user) throw new HttpError(401, 'unauthorized');
  return { token, user };
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const name = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

async function memberRegister(body: Record<string, unknown>, req: Request, deps: Deps) {
  const name = cleanName(body.fullName);
  if (!name) throw new HttpError(400, 'invalid_name');

  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : null;
  if (!phone) throw new HttpError(400, 'invalid_phone');

  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) throw new HttpError(400, 'invalid_password');
  if (password.includes(phone) || password.toLowerCase() === name.toLowerCase()) throw new HttpError(400, 'weak_password');

  await limit(deps, `register:ip:${clientIp(req)}`, '1 hour', 5);
  await limit(deps, `register:phone:${phone}`, '1 hour', 3);

  const email = phoneToEmail(phone);
  const created = await deps.createAuthUser({
    email,
    password,
    metadata: { account_type: 'member', full_name: name, phone },
  });
  if (created.error || !created.id) {
    if (/already|exists|registered/i.test(created.error?.message ?? '') || created.error?.code === 'email_exists') {
      throw new HttpError(409, 'phone_exists');
    }
    throw new HttpError(500, 'server_error');
  }

  const reg = await deps.rpc<string>('register_member_request', { p_user: created.id, p_name: name, p_phone: phone, p_email: email });
  if (reg.error || typeof reg.data !== 'string') {
    await deps.deleteAuthUser(created.id); // pas de compte à moitié créé
    throw new HttpError(500, 'server_error');
  }
  return { code: reg.data, phone };
}

async function memberResetPassword(body: Record<string, unknown>, req: Request, deps: Deps) {
  const { token, user } = await requireUser(req, deps);
  const accessId = body.accessId;
  if (typeof accessId !== 'string' || !UUID_RE.test(accessId)) throw new HttpError(400, 'invalid_request');

  await limit(deps, `reset:user:${user.id}`, '1 hour', 10);

  const access = await deps.getFamilyAccess(accessId);
  if (!access || !['active', 'suspended'].includes(access.status)) throw new HttpError(404, 'not_found');

  const isOwner = access.owner_id === user.id;
  if (!isOwner) {
    // Le super administrateur (avec deuxième facteur) peut aussi réinitialiser
    const gate = await deps.rpcAs(token, 'admin_gate');
    if (gate.error) throw new HttpError(403, 'forbidden');
  }

  const temp = deps.randomPassword();
  const updated = await deps.updateAuthUser(access.member_user_id, {
    password: temp,
    metadata: { account_type: 'member', full_name: access.full_name, phone: access.phone, must_change_password: true },
  });
  if (updated.error) throw new HttpError(500, 'server_error');

  await deps.rpc('purge_user_sessions', { p_user: access.member_user_id });
  await deps.rpc('admin_log_service', {
    p_actor: user.id, p_actor_email: user.email, p_action: isOwner ? 'member_password_reset' : 'admin_member_password_reset',
    p_target: access.member_user_id, p_label: access.full_name, p_details: {},
  });
  return { tempPassword: temp };
}

async function adminDeleteUser(body: Record<string, unknown>, req: Request, deps: Deps) {
  const { token, user } = await requireUser(req, deps);
  const target = body.userId;
  if (typeof target !== 'string' || !UUID_RE.test(target)) throw new HttpError(400, 'invalid_request');

  const gate = await deps.rpcAs(token, 'admin_gate'); // identité confirmée + deuxième facteur
  if (gate.error) throw new HttpError(403, /mfa_required/.test(gate.error.message) ? 'mfa_required' : 'forbidden');

  await limit(deps, `admin-delete:${user.id}`, '1 hour', 30);

  if (target === user.id) throw new HttpError(400, 'cannot_target_self');
  const isAdmin = await deps.rpc<boolean>('is_admin_user', { p_user: target });
  if (isAdmin.error) throw new HttpError(500, 'server_error');
  if (isAdmin.data === true) throw new HttpError(400, 'cannot_target_admin');

  const paths = await deps.rpc<string[]>('admin_user_receipt_paths', { p_user: target });
  if (paths.error) throw new HttpError(500, 'server_error');
  const files = (paths.data ?? []) as string[];
  for (let i = 0; i < files.length; i += 100) await deps.removeReceipts(files.slice(i, i + 100));

  const deleted = await deps.deleteAuthUser(target);
  if (deleted.error) throw new HttpError(404, 'user_not_found');

  await deps.rpc('admin_log_service', {
    p_actor: user.id, p_actor_email: user.email, p_action: 'user_deleted', p_target: target, p_label: '', p_details: { files_removed: files.length },
  });
  return { ok: true, filesRemoved: files.length };
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const cors = corsHeaders(req.headers.get('origin'), deps.allowedOrigins);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors);

  // Un navigateur depuis une origine inconnue n'obtient rien
  const origin = req.headers.get('origin');
  if (origin && !deps.allowedOrigins.includes(origin)) return json(403, { error: 'forbidden_origin' }, cors);

  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(400, 'invalid_json');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new HttpError(400, 'invalid_request');

    switch (body.action) {
      case 'member_register':
        return json(200, await memberRegister(body, req, deps), cors);
      case 'member_reset_password':
        return json(200, await memberResetPassword(body, req, deps), cors);
      case 'admin_delete_user':
        return json(200, await adminDeleteUser(body, req, deps), cors);
      default:
        throw new HttpError(400, 'unknown_action');
    }
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code }, cors);
    return json(500, { error: 'server_error' }, cors);
  }
}
