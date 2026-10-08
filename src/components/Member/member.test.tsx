// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';
import { moneyTexts } from '../../test/harness';

const db = new FakeDb();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => db.from(table),
    rpc: (name: string, args: Record<string, unknown>) => db.rpc(name, args),
    get storage() { return db.storage; },
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'm1', email: 'p237677112233@phone.fintrack.invalid', user_metadata: { account_type: 'member', full_name: 'Junior Ndongo', phone: '237677112233' } } },
    loading: false, recovery: false, finishRecovery: () => undefined, signOut: async () => undefined,
  }),
}));

import { LanguageProvider } from '../../i18n';
import { RegionProvider } from '../../hooks/useRegion';
import { AccessProvider } from '../../hooks/useAccess';
import { TransactionsProvider } from '../../hooks/useTransactions';
import { FamilyProvider } from '../../hooks/useFamilyMembers';
import { CategoriesProvider } from '../../hooks/useCategories';
import { ActivityBudgetsProvider } from '../../hooks/useActivityBudgets';
import { todayISO } from '../../lib/dates';
import { PendingAccess } from './PendingAccess';
import { MySpace } from './MySpace';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    <RegionProvider>
      <AccessProvider>
        <TransactionsProvider>
          <FamilyProvider>
            <CategoriesProvider>
              <ActivityBudgetsProvider>{children}</ActivityBudgetsProvider>
            </CategoriesProvider>
          </FamilyProvider>
        </TransactionsProvider>
      </AccessProvider>
    </RegionProvider>
  </LanguageProvider>
);

const seedAccess = (over: Record<string, unknown> = {}) =>
  db.seed('family_access', {
    id: 'acc-1', owner_id: 'owner-1', member_user_id: 'm1', family_member_id: 'fm-1', full_name: 'Junior Ndongo',
    phone: '237677112233', login_email: 'p237677112233@phone.fintrack.invalid', request_code: 'K7M2QX9R',
    status: 'active', perm_add_expenses: true, perm_view_family: false, ...over,
  });

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  db.rpcHandlers = { platform_admin_status: () => ({ data: { is_admin: false }, error: null }) };
  db.rpcCalls = [];
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});
afterEach(() => cleanup());

describe('Membre : en attente de validation', () => {
  it('affiche le code à transmettre, avec un message WhatsApp prêt à envoyer', async () => {
    seedAccess({ status: 'requested', owner_id: null, family_member_id: null });
    render(<Providers><PendingAccess /></Providers>);

    expect(await screen.findByTestId('request-code')).toBeTruthy();
    expect(screen.getByTestId('request-code').textContent).toBe('K7M2-QX9R');
    expect(screen.getByText(/Demande envoyée/)).toBeTruthy();
    const wa = screen.getByRole('link', { name: /WhatsApp/ }) as HTMLAnchorElement;
    const text = decodeURIComponent(wa.href);
    expect(text).toContain('K7M2-QX9R');
    expect(text).toContain('Junior Ndongo');
    expect(text).toContain('+237 6 77 11 22 33');
    expect(wa.rel).toContain('noopener');
  });

  it("explique la suspension d'un accès", async () => {
    seedAccess({ status: 'suspended' });
    render(<Providers><PendingAccess /></Providers>);
    expect(await screen.findByText('Accès suspendu')).toBeTruthy();
  });

  it("permet de refaire une demande après un refus, avec un nouveau code", async () => {
    seedAccess({ status: 'rejected', owner_id: null, family_member_id: null });
    db.rpcHandlers.renew_access_request = () => {
      db.tables.family_access[0].status = 'requested';
      db.tables.family_access[0].request_code = 'NEWCODE2';
      return { data: 'NEWCODE2', error: null };
    };
    const user = userEvent.setup();
    render(<Providers><PendingAccess /></Providers>);

    await user.click(await screen.findByRole('button', { name: 'Faire une nouvelle demande' }));
    await waitFor(() => expect(db.rpcCalls.some(c => c.name === 'renew_access_request')).toBe(true));
    expect((await screen.findByTestId('request-code')).textContent).toBe('NEWC-ODE2');
  });
});

describe('Membre : mon espace', () => {
  const seedFamily = () => {
    db.seed('family_members', { id: 'fm-1', user_id: 'owner-1', name: 'Junior', role: 'Fils', monthly_allowance: 20000 });
    db.seed('transactions', { user_id: 'owner-1', family_member_id: 'fm-1', type: 'expense', category: 'Alimentation', amount: 5000, description: 'Cantine', date: todayISO() });
  };

  it("montre ce qu'il reste sur son budget du mois et ses dépenses", async () => {
    seedAccess();
    seedFamily();
    render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);

    expect(await screen.findByRole('heading', { name: 'Bonjour Junior' })).toBeTruthy();
    await waitFor(() => expect(moneyTexts(15000).length).toBeGreaterThan(0)); // 20 000 − 5 000
    expect(screen.getByText('Cantine')).toBeTruthy();
  });

  it("enregistre une dépense dans les livres de son administrateur, rattachée à lui, sans compte ni récurrence", async () => {
    seedAccess();
    seedFamily();
    const user = userEvent.setup();
    render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);

    await user.click(await screen.findByRole('button', { name: /Ajouter une dépense/ }));
    await user.type(screen.getByLabelText(/Montant/), '1500');
    await user.type(screen.getByLabelText(/Description/), 'Taxi école');
    await user.click(screen.getByRole('button', { name: 'Transport' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(db.tables.transactions).toHaveLength(2));
    const created = db.tables.transactions.find(t => t.description === 'Taxi école')!;
    expect(created).toMatchObject({
      user_id: 'owner-1', family_member_id: 'fm-1', type: 'expense', category: 'Transport', amount: 1500,
      account_id: null, is_recurring: false, recurrence_parent_id: null,
    });
    expect(await screen.findByText('Dépense enregistrée.')).toBeTruthy();
    await waitFor(() => expect(moneyTexts(13500).length).toBeGreaterThan(0)); // 20 000 − 6 500
  });

  it("sans le droit de saisie : consultation seule, aucun bouton d'ajout", async () => {
    seedAccess({ perm_add_expenses: false });
    seedFamily();
    render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);

    expect(await screen.findByText(/demandez ce droit à l'administrateur/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ajouter une dépense/ })).toBeNull();
    expect(screen.getByText('✗ Ajouter mes dépenses')).toBeTruthy();
  });

  it("n'affiche le budget de toute la famille qu'avec le droit correspondant", async () => {
    seedAccess({ perm_view_family: false });
    seedFamily();
    db.seed('family_members', { id: 'fm-2', user_id: 'owner-1', name: 'Marie', role: 'Mère' });
    const { unmount } = render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);
    await screen.findByRole('heading', { name: 'Bonjour Junior' });
    expect(screen.queryByText(/Budget de la famille ce mois-ci/)).toBeNull();
    unmount();

    db.tables.family_access[0].perm_view_family = true;
    render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);
    expect(await screen.findByText(/Budget de la famille ce mois-ci/)).toBeTruthy();
    expect(screen.getByText('Marie')).toBeTruthy();
  });

  it("ne génère jamais les transactions récurrentes de l'administrateur", async () => {
    seedAccess();
    seedFamily();
    db.seed('transactions', {
      user_id: 'owner-1', family_member_id: 'fm-1', type: 'expense', amount: 1000, description: 'Abonnement', date: '2026-01-01',
      is_recurring: true, recurrence_frequency: 'monthly', next_recurrence_date: '2026-02-01',
    });
    render(<Providers><MySpace onNavigate={() => undefined} /></Providers>);
    await screen.findByRole('heading', { name: 'Bonjour Junior' });
    await new Promise(r => setTimeout(r, 100));
    expect(db.tables.transactions.filter(t => t.recurrence_parent_id)).toHaveLength(0);
  });
});
