/**
 * Mini base de données en mémoire imitant la partie de l'API supabase-js utilisée par l'application.
 * Sert uniquement aux tests d'interface.
 */
type Row = Record<string, any>;

const DEFAULTS: Record<string, () => Row> = {
  projects: () => ({ description: '', scope: 'personal', target_amount: 0, color: '#3B82F6', icon: 'FolderOpen', status: 'active', start_date: null, end_date: null, code: '', responsible: '' }),
  project_categories: () => ({ allocated_amount: 0, color: '#3B82F6', sort_order: 0 }),
  project_transactions: () => ({ category_id: null, payee: '', reference: '', payment_method: '', note: '', source_transaction_id: null }),
  transactions: () => ({ account_id: null, tags: [], family_member_id: null, is_recurring: false, recurrence_frequency: null, recurrence_parent_id: null, next_recurrence_date: null }),
  accounts: () => ({ type: 'checking', balance: 0, currency: 'XAF', color: '#3B82F6' }),
  family_members: () => ({ role: 'Autre', avatar_color: '#3B82F6', monthly_allowance: 0 }),
  categories: () => ({ color: '#6B7280', icon: 'Tag' }),
  budgets: () => ({}),
  goals: () => ({ current_amount: 0 }),
  vault_items: () => ({ type: 'password', data: {} }),
  vault_settings: () => ({ iterations: 310000 }),
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  private counter = 0;

  constructor() {
    Object.keys(DEFAULTS).forEach(t => { this.tables[t] = []; });
  }

  nextId(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`;
  }

  seed(table: string, row: Row): Row {
    const full = { id: this.nextId(), user_id: 'u1', created_at: new Date(2026, 0, 1, 0, 0, this.counter).toISOString(), ...DEFAULTS[table](), ...row };
    this.tables[table].push(full);
    return full;
  }

  from(table: string) {
    return new Query(this, table);
  }
}

class Query implements PromiseLike<{ data: any; error: any }> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row[] = [];
  private patch: Row = {};
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private returning = false;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(private db: FakeDb, private table: string) {}

  select() { if (this.op !== 'select') this.returning = true; return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) { this.op = 'upsert'; this.payload = Array.isArray(rows) ? rows : [rows]; this.upsertOpts = opts; return this; }
  update(patch: Row) { this.op = 'update'; this.patch = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, val: any) { this.filters.push(r => r[col] === val); return this; }
  not(col: string, _op: string, val: any) { this.filters.push(r => r[col] !== val); return this; }
  lte(col: string, val: any) { this.filters.push(r => r[col] != null && r[col] <= val); return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.orders.push({ col, asc: o.ascending !== false }); return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }

  private run(): { data: any; error: any } {
    const rows = this.db.tables[this.table];
    const matching = () => rows.filter(r => this.filters.every(f => f(r)));
    let result: Row[] = [];

    if (this.op === 'insert' || this.op === 'upsert') {
      for (const p of this.payload) {
        const row: Row = { id: this.db.nextId(), user_id: 'u1', created_at: new Date().toISOString(), ...DEFAULTS[this.table](), ...p };
        if (this.table === 'project_categories' && rows.some(r => r.project_id === row.project_id && String(r.name).toLowerCase() === String(row.name).toLowerCase())) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
        }
        if (this.op === 'upsert' && this.upsertOpts.onConflict) {
          const cols = this.upsertOpts.onConflict.split(',');
          if (rows.some(r => cols.every(c => r[c] === row[c]))) continue; // ignoreDuplicates
        }
        rows.push(row);
        result.push(row);
      }
    } else if (this.op === 'update') {
      result = matching();
      result.forEach(r => Object.assign(r, this.patch));
    } else if (this.op === 'delete') {
      const del = matching();
      this.db.tables[this.table] = rows.filter(r => !del.includes(r));
      // Cascades / SET NULL utiles aux tests
      if (this.table === 'projects') {
        const ids = del.map(d => d.id);
        this.db.tables.project_categories = this.db.tables.project_categories.filter(c => !ids.includes(c.project_id));
        this.db.tables.project_transactions = this.db.tables.project_transactions.filter(c => !ids.includes(c.project_id));
      }
      if (this.table === 'project_categories') {
        const ids = del.map(d => d.id);
        this.db.tables.project_transactions.forEach(t => { if (ids.includes(t.category_id)) t.category_id = null; });
      }
      if (this.table === 'transactions') {
        const ids = del.map(d => d.id);
        this.db.tables.project_transactions.forEach(t => { if (ids.includes(t.source_transaction_id)) t.source_transaction_id = null; });
      }
      return { data: null, error: null };
    } else {
      result = matching();
    }

    if (this.orders.length) {
      result = [...result].sort((a, b) => {
        for (const { col, asc } of this.orders) {
          if (a[col] === b[col]) continue;
          return (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1);
        }
        return 0;
      });
    }

    if (this.op !== 'select' && !this.returning) return { data: null, error: null };
    const clone = (r: Row) => JSON.parse(JSON.stringify(r));
    if (this.mode === 'single') {
      if (result.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${result.length}` } };
      return { data: clone(result[0]), error: null };
    }
    if (this.mode === 'maybe') return { data: result[0] ? clone(result[0]) : null, error: null };
    return { data: result.map(clone), error: null };
  }

  then<R1 = { data: any; error: any }, R2 = never>(
    onfulfilled?: ((v: { data: any; error: any }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
  }
}
