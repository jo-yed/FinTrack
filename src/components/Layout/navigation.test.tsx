// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();
const who = vi.hoisted(() => ({
  user: { id: 'u1', email: 'chef@famille.cm', user_metadata: {} as Record<string, unknown> },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => db.from(table),
    rpc: (name: string, args: Record<string, unknown>) => db.rpc(name, args),
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: who.user }, loading: false, recovery: false, finishRecovery: () => undefined, signOut: async () => undefined }),
}));

import { LanguageProvider } from '../../i18n';
import { AccessProvider } from '../../hooks/useAccess';
import { Sidebar } from './Sidebar';
import { AnnouncementBanner } from './AnnouncementBanner';

const renderSidebar = () =>
  render(
    <LanguageProvider>
      <AccessProvider>
        <Sidebar currentPage="dashboard" onPageChange={() => undefined} />
        <AnnouncementBanner />
      </AccessProvider>
    </LanguageProvider>,
  );

const hasItem = (name: RegExp) => screen.queryByRole('button', { name }) !== null;

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  db.rpcCalls = [];
  db.rpcHandlers = { platform_admin_status: () => ({ data: { is_admin: false }, error: null }) };
  who.user = { id: 'u1', email: 'chef@famille.cm', user_metadata: {} };
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('Menus selon le profil', () => {
  it("administrateur de famille : tout sauf l'espace membre et la console d'administration", async () => {
    renderSidebar();
    expect(await screen.findByRole('button', { name: /Coffre-Fort/ })).toBeTruthy();
    expect(hasItem(/Mes Comptes/)).toBe(true);
    expect(hasItem(/Budgets Perso & Pro/)).toBe(true);
    expect(hasItem(/Mon espace/)).toBe(false);
    expect(hasItem(/Administration/)).toBe(false);
  });

  it("super administrateur : voit en plus « Administration »", async () => {
    db.rpcHandlers.platform_admin_status = () => ({ data: { is_admin: true }, error: null });
    renderSidebar();
    expect(await screen.findByRole('button', { name: /Administration/ })).toBeTruthy();
    expect(hasItem(/Coffre-Fort/)).toBe(true);
  });

  it("membre « enfant » : uniquement son espace, les budgets partagés et les paramètres", async () => {
    who.user = { id: 'm1', email: 'p237677112233@phone.fintrack.invalid', user_metadata: { account_type: 'member' } };
    db.seed('family_access', { member_user_id: 'm1', owner_id: 'o1', family_member_id: 'f1', status: 'active', perm_add_expenses: true, perm_view_family: false });
    renderSidebar();

    expect(await screen.findByRole('button', { name: /Mon espace/ })).toBeTruthy();
    expect(hasItem(/Budgets partagés/)).toBe(true);
    expect(hasItem(/Paramètres/)).toBe(true);
    for (const forbidden of [/Coffre-Fort/, /Mes Comptes/, /Objectifs/, /Tableau de Bord/, /Transactions/, /Administration/, /Budget Famille/]) {
      expect(hasItem(forbidden)).toBe(false);
    }
    // Un membre ne cherche même pas à savoir s'il est administrateur
    expect(db.rpcCalls.some(c => c.name === 'platform_admin_status')).toBe(false);
  });

  it('membre « conjoint » : voit aussi le budget famille', async () => {
    who.user = { id: 'm2', email: 'p237699887766@phone.fintrack.invalid', user_metadata: { account_type: 'member' } };
    db.seed('family_access', { member_user_id: 'm2', owner_id: 'o1', family_member_id: 'f2', status: 'active', perm_add_expenses: true, perm_view_family: true });
    renderSidebar();
    expect(await screen.findByRole('button', { name: /Budget Famille/ })).toBeTruthy();
    expect(hasItem(/Coffre-Fort/)).toBe(false);
  });
});

describe("Annonce de la plateforme", () => {
  it("s'affiche pour tout utilisateur connecté et peut être fermée (sauf si critique)", async () => {
    db.seed('platform_settings', { id: true, announcement: 'Maintenance dimanche 22h', announcement_level: 'warning' });
    const { unmount } = renderSidebar();
    expect(await screen.findByText('Maintenance dimanche 22h')).toBeTruthy();
    screen.getByRole('button', { name: 'Fermer' }).click();
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText('Maintenance dimanche 22h')).toBeNull();
    unmount();

    db.tables.platform_settings[0].announcement_level = 'critical';
    sessionStorage.clear();
    renderSidebar();
    expect(await screen.findByText('Maintenance dimanche 22h')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fermer' })).toBeNull();
  });

  it("n'affiche rien quand il n'y a pas d'annonce", async () => {
    renderSidebar();
    await screen.findByRole('button', { name: /Coffre-Fort/ });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
