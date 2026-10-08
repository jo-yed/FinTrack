import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from './handler';
import type { Deps, RpcResult } from './handler';

const ORIGIN = 'https://fin-track-theta-ten.vercel.app';
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_ACCESS = '33333333-3333-4333-8333-333333333333';

function makeDeps(over: Partial<Deps> = {}): Deps & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  const track = (name: string, ...args: unknown[]) => { (calls[name] ||= []).push(args); };
  const deps: Deps = {
    allowedOrigins: [ORIGIN, 'http://localhost:5173'],
    createAuthUser: async args => { track('createAuthUser', args); return { id: UUID_B, error: null }; },
    updateAuthUser: async (id, attrs) => { track('updateAuthUser', id, attrs); return { error: null }; },
    deleteAuthUser: async id => { track('deleteAuthUser', id); return { error: null }; },
    getUser: async token => (token === 'valid' ? { id: UUID_A, email: 'chef@famille.cm' } : null),
    rpc: async <T,>(name: string, args?: Record<string, unknown>): Promise<RpcResult<T>> => {
      track('rpc', name, args);
      if (name === 'rate_limit_hit') return { data: true as T, error: null };
      if (name === 'register_member_request') return { data: 'K7M2QX9R' as T, error: null };
      if (name === 'is_admin_user') return { data: false as T, error: null };
      if (name === 'admin_user_receipt_paths') return { data: [] as T, error: null };
      return { data: null, error: null };
    },
    rpcAs: async <T,>(token: string, name: string): Promise<RpcResult<T>> => {
      track('rpcAs', token, name);
      return { data: null, error: { message: 'forbidden' } };
    },
    getFamilyAccess: async id => ({ id, owner_id: UUID_A, member_user_id: UUID_B, full_name: 'Junior', phone: '237600000001', status: 'active' }),
    removeReceipts: async paths => { track('removeReceipts', paths); },
    randomPassword: () => 'TempPass123',
    hashKey: async v => `h(${v})`,
    ...over,
  };
  return Object.assign(deps, { calls });
}

const post = (body: unknown, headers: Record<string, string> = {}, raw?: string) =>
  new Request('https://x.supabase.co/functions/v1/fintrack-api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': '41.202.1.1', ...headers },
    body: raw ?? JSON.stringify(body),
  });

const read = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe('protocole (CORS, méthodes, corps)', () => {
  it('répond au préflight CORS uniquement pour une origine autorisée', async () => {
    const ok = await handle(new Request('https://x', { method: 'OPTIONS', headers: { origin: ORIGIN } }), makeDeps());
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const bad = await handle(new Request('https://x', { method: 'OPTIONS', headers: { origin: 'https://pirate.example' } }), makeDeps());
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it("refuse une origine inconnue, une méthode GET, un JSON invalide, un corps énorme et une action inconnue", async () => {
    const deps = makeDeps();
    expect((await handle(post({ action: 'member_register' }, { origin: 'https://pirate.example' }), deps)).status).toBe(403);
    expect((await handle(new Request('https://x', { method: 'GET' }), deps)).status).toBe(405);
    expect((await handle(post(null, {}, '{pas du json'), deps)).status).toBe(400);
    expect((await handle(post(null, {}, JSON.stringify({ action: 'x', pad: 'a'.repeat(5000) })), deps)).status).toBe(413);
    expect((await handle(post({ action: 'rien' }), deps)).status).toBe(400);
    expect((await handle(post(null, {}, '[1,2]'), deps)).status).toBe(400);
  });

  it('ne met jamais les réponses en cache', async () => {
    const res = await handle(post({ action: 'rien' }), makeDeps());
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('masque les erreurs internes', async () => {
    const deps = makeDeps({ createAuthUser: async () => { throw new Error('connexion à la base : mot de passe postgres=abc'); } });
    const res = await handle(post({ action: 'member_register', fullName: 'Junior', phone: '677112233', password: 'MotDePasse-1' }), deps);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await read(res))).not.toContain('postgres');
  });
});

describe('member_register', () => {
  const valid = { action: 'member_register', fullName: '  Junior  Ndongo ', phone: '6 77 11 22 33', password: 'MotDePasse-1' };

  it('crée le compte confirmé avec une adresse technique sur domaine réservé, puis renvoie le code', async () => {
    const deps = makeDeps();
    const res = await handle(post(valid), deps);
    expect(res.status).toBe(200);
    expect(await read(res)).toEqual({ code: 'K7M2QX9R', phone: '237677112233' });
    expect(deps.calls.createAuthUser[0][0]).toEqual({
      email: 'p237677112233@phone.fintrack.invalid',
      password: 'MotDePasse-1',
      metadata: { account_type: 'member', full_name: 'Junior Ndongo', phone: '237677112233' },
    });
    const rpcCalls = deps.calls.rpc.map(c => c[0]);
    expect(rpcCalls).toEqual(['rate_limit_hit', 'rate_limit_hit', 'register_member_request']);
  });

  it.each([
    [{ ...valid, fullName: 'A' }, 'invalid_name'],
    [{ ...valid, fullName: 12 }, 'invalid_name'],
    [{ ...valid, phone: '12345' }, 'invalid_phone'],
    [{ ...valid, phone: undefined }, 'invalid_phone'],
    [{ ...valid, password: 'court' }, 'invalid_password'],
    [{ ...valid, password: 'x'.repeat(73) }, 'invalid_password'],
    [{ ...valid, password: '237677112233' }, 'weak_password'],
    [{ ...valid, password: 'junior ndongo' }, 'weak_password'],
  ])('refuse une saisie invalide : %#', async (body, code) => {
    const deps = makeDeps();
    const res = await handle(post(body), deps);
    expect(res.status).toBe(400);
    expect((await read(res)).error).toBe(code);
    expect(deps.calls.createAuthUser).toBeUndefined(); // rien n'est créé
  });

  it('nettoie les caractères dangereux du nom', async () => {
    const deps = makeDeps();
    await handle(post({ ...valid, fullName: '<script>alert(1)</script>Junior' }), deps);
    const meta = (deps.calls.createAuthUser[0][0] as { metadata: { full_name: string } }).metadata;
    expect(meta.full_name).not.toMatch(/[<>]/);
  });

  it('applique la limitation par adresse IP puis par numéro', async () => {
    const deps = makeDeps({
      rpc: async <T,>(name: string, args?: Record<string, unknown>): Promise<RpcResult<T>> =>
        name === 'rate_limit_hit' ? { data: ((args?.p_key as string).includes('ip:') ? false : true) as T, error: null } : { data: null, error: null },
    });
    const res = await handle(post(valid), deps);
    expect(res.status).toBe(429);
    expect(deps.calls.createAuthUser).toBeUndefined();
  });

  it('signale un numéro déjà inscrit', async () => {
    const deps = makeDeps({ createAuthUser: async () => ({ id: null, error: { message: 'A user with this email address has already been registered', code: 'email_exists' } }) });
    const res = await handle(post(valid), deps);
    expect(res.status).toBe(409);
    expect((await read(res)).error).toBe('phone_exists');
  });

  it("annule la création du compte si l'enregistrement de la demande échoue", async () => {
    const deps = makeDeps({
      rpc: async <T,>(name: string): Promise<RpcResult<T>> =>
        name === 'register_member_request' ? { data: null, error: { message: 'boom' } } : { data: true as T, error: null },
    });
    const res = await handle(post(valid), deps);
    expect(res.status).toBe(500);
    expect(deps.calls.deleteAuthUser).toEqual([[UUID_B]]);
  });
});

describe('member_reset_password', () => {
  const body = { action: 'member_reset_password', accessId: UUID_ACCESS };
  const auth = { authorization: 'Bearer valid' };

  it('exige une connexion valide', async () => {
    expect((await handle(post(body), makeDeps())).status).toBe(401);
    expect((await handle(post(body, { authorization: 'Bearer faux' }), makeDeps())).status).toBe(401);
  });

  it("l'administrateur de la famille obtient un mot de passe provisoire, à changer à la première connexion", async () => {
    const deps = makeDeps();
    const res = await handle(post(body, auth), deps);
    expect(res.status).toBe(200);
    expect(await read(res)).toEqual({ tempPassword: 'TempPass123' });
    expect(deps.calls.updateAuthUser[0]).toEqual([UUID_B, {
      password: 'TempPass123',
      metadata: { account_type: 'member', full_name: 'Junior', phone: '237600000001', must_change_password: true },
    }]);
    expect(deps.calls.rpc.some(c => c[0] === 'purge_user_sessions')).toBe(true); // anciennes sessions fermées
    expect(deps.calls.rpc.some(c => c[0] === 'admin_log_service')).toBe(true);
  });

  it("refuse à quelqu'un qui n'est pas l'administrateur de cette famille", async () => {
    const deps = makeDeps({ getFamilyAccess: async id => ({ id, owner_id: UUID_B, member_user_id: UUID_B, full_name: 'X', phone: '237600000001', status: 'active' }) });
    const res = await handle(post(body, auth), deps);
    expect(res.status).toBe(403);
    expect(deps.calls.updateAuthUser).toBeUndefined();
  });

  it('autorise le super administrateur (deuxième facteur vérifié par la base)', async () => {
    const deps = makeDeps({
      getFamilyAccess: async id => ({ id, owner_id: UUID_B, member_user_id: UUID_B, full_name: 'X', phone: '237600000001', status: 'active' }),
      rpcAs: async <T,>(): Promise<RpcResult<T>> => ({ data: null, error: null }),
    });
    expect((await handle(post(body, auth), deps)).status).toBe(200);
  });

  it('refuse un identifiant invalide ou une demande non active', async () => {
    expect((await handle(post({ ...body, accessId: "1'; DROP TABLE x;--" }, auth), makeDeps())).status).toBe(400);
    const pending = makeDeps({ getFamilyAccess: async id => ({ id, owner_id: UUID_A, member_user_id: UUID_B, full_name: 'X', phone: '237600000001', status: 'requested' }) });
    expect((await handle(post(body, auth), pending)).status).toBe(404);
    const missing = makeDeps({ getFamilyAccess: async () => null });
    expect((await handle(post(body, auth), missing)).status).toBe(404);
  });

  it('est limitée à 10 réinitialisations par heure', async () => {
    const deps = makeDeps({ rpc: async <T,>(name: string): Promise<RpcResult<T>> => (name === 'rate_limit_hit' ? { data: false as T, error: null } : { data: null, error: null }) });
    expect((await handle(post(body, auth), deps)).status).toBe(429);
  });
});

describe('admin_delete_user', () => {
  const body = { action: 'admin_delete_user', userId: UUID_B };
  const auth = { authorization: 'Bearer valid' };
  const adminOk = { rpcAs: async <T,>(): Promise<RpcResult<T>> => ({ data: null, error: null }) };

  it("refuse un utilisateur ordinaire, et signale l'absence de deuxième facteur", async () => {
    expect((await handle(post(body), makeDeps(adminOk))).status).toBe(401);
    const res = await handle(post(body, auth), makeDeps());
    expect(res.status).toBe(403);
    const mfa = makeDeps({ rpcAs: async <T,>(): Promise<RpcResult<T>> => ({ data: null, error: { message: 'mfa_required' } }) });
    const res2 = await handle(post(body, auth), mfa);
    expect(res2.status).toBe(403);
    expect((await read(res2)).error).toBe('mfa_required');
    expect(mfa.calls.deleteAuthUser).toBeUndefined();
  });

  it('supprime les fichiers par paquets de 100 puis le compte, et journalise', async () => {
    const files = Array.from({ length: 230 }, (_, i) => `p/e/f${i}.pdf`);
    const deps = makeDeps({
      ...adminOk,
      rpc: async <T,>(name: string): Promise<RpcResult<T>> =>
        name === 'admin_user_receipt_paths' ? { data: files as T, error: null }
        : name === 'rate_limit_hit' ? { data: true as T, error: null }
        : name === 'is_admin_user' ? { data: false as T, error: null }
        : { data: null, error: null },
    });
    const res = await handle(post(body, auth), deps);
    expect(res.status).toBe(200);
    expect(await read(res)).toEqual({ ok: true, filesRemoved: 230 });
    expect(deps.calls.removeReceipts.map(c => (c[0] as string[]).length)).toEqual([100, 100, 30]);
    expect(deps.calls.deleteAuthUser).toEqual([[UUID_B]]);
  });

  it("refuse de supprimer son propre compte ou celui d'un autre administrateur", async () => {
    const self = makeDeps(adminOk);
    expect((await read(await handle(post({ ...body, userId: UUID_A }, auth), self))).error).toBe('cannot_target_self');
    const other = makeDeps({
      ...adminOk,
      rpc: async <T,>(name: string): Promise<RpcResult<T>> => (name === 'is_admin_user' ? { data: true as T, error: null } : { data: true as T, error: null }),
    });
    expect((await read(await handle(post(body, auth), other))).error).toBe('cannot_target_admin');
    expect(other.calls.deleteAuthUser).toBeUndefined();
  });

  it('refuse un identifiant invalide', async () => {
    expect((await handle(post({ ...body, userId: 'pas-un-uuid' }, auth), makeDeps(adminOk))).status).toBe(400);
  });
});

beforeEach(() => vi.clearAllMocks());
