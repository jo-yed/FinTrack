// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (table: string) => db.from(table), get storage() { return db.storage; } },
  isSupabaseConfigured: true,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1', email: 'owner@test.com' } },
    loading: false, recovery: false, finishRecovery: () => undefined, signOut: async () => undefined,
  }),
}));

import { Harness, moneyTexts } from '../../test/harness';
import { todayISO } from '../../lib/dates';

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  db.files.clear();
  db.failUploads = false;
  localStorage.clear();
  setOnline(true);
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

afterEach(() => cleanup());

const seedBudget = (over: Record<string, unknown> = {}) =>
  db.seed('projects', { name: 'Budget pro', scope: 'professional', target_amount: 1000, owner_email: 'owner@test.com', ...over });

describe('Validation des dépenses (propriétaire)', () => {
  it("n'inclut pas les dépenses en attente dans les totaux, puis les valide ou les rejette avec un motif", async () => {
    const project = seedBudget({ requires_approval: true });
    db.seed('project_transactions', { project_id: project.id, type: 'income', label: 'Fonds', amount: 1000, date: '2026-02-01' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'Taxi', amount: 300, date: '2026-02-02', status: 'pending', user_id: 'editor-1', created_by_email: 'ed@test.com' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'Repas', amount: 50, date: '2026-02-03', status: 'pending', user_id: 'editor-1', created_by_email: 'ed@test.com' });
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    expect(await screen.findByText(/2 écriture\(s\) en attente de validation/)).toBeTruthy();
    expect(moneyTexts(1000).length).toBeGreaterThan(0);  // solde en caisse = fonds : rien de dépensé de façon validée
    expect(moneyTexts(700).length).toBe(0);

    // Validation d'une dépense
    await user.click(screen.getByRole('button', { name: 'Valider Taxi' }));
    await waitFor(() => expect(db.tables.project_transactions.find(e => e.label === 'Taxi')!.status).toBe('approved'));
    await waitFor(() => expect(moneyTexts(700).length).toBeGreaterThan(0));
    expect(await screen.findByText(/1 écriture\(s\) en attente de validation/)).toBeTruthy();

    // Rejet avec motif
    await user.click(screen.getByRole('button', { name: 'Rejeter Repas' }));
    await user.type(screen.getByPlaceholderText('Motif du rejet'), 'Pas de facture');
    await user.click(screen.getByRole('button', { name: 'Rejeter la dépense' }));
    await waitFor(() => expect(db.tables.project_transactions.find(e => e.label === 'Repas')).toMatchObject({ status: 'rejected', rejection_reason: 'Pas de facture' }));
    expect(await screen.findByText(/Motif : Pas de facture/)).toBeTruthy();
    expect(moneyTexts(700).length).toBeGreaterThan(0); // la dépense rejetée ne compte pas
    await waitFor(() => expect(screen.queryByText(/en attente de validation/)).toBeNull());
  });

  it('« Tout valider » approuve toutes les écritures en attente', async () => {
    const project = seedBudget({ requires_approval: true });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'A', amount: 10, date: '2026-02-02', status: 'pending', user_id: 'e' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'B', amount: 20, date: '2026-02-02', status: 'pending', user_id: 'e' });
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click(await screen.findByRole('button', { name: /Tout valider/ }));
    await waitFor(() => expect(db.tables.project_transactions.every(e => e.status === 'approved')).toBe(true));
  });
});

describe('Rôles sur un budget partagé', () => {
  it("un éditeur peut saisir mais ne gère ni le partage, ni le budget, et ne modifie que ses propres écritures", async () => {
    const project = seedBudget({ user_id: 'boss', owner_email: 'boss@test.com' });
    db.seed('project_members', { project_id: project.id, email: 'owner@test.com', role: 'editor' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'Mienne', amount: 10, date: '2026-02-02', user_id: 'u1' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'Du patron', amount: 20, date: '2026-02-02', user_id: 'boss' });
    render(<Harness initialId={project.id} />);

    expect(await screen.findByText(/Partagé par/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Nouvelle dépense/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Partage/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeNull();
    expect(screen.getByRole('button', { name: /Quitter ce budget/ })).toBeTruthy();
    // une seule écriture éditable : la sienne
    expect(screen.getAllByRole('button', { name: 'Modifier' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Clôturer/ })).toBeNull();
  });

  it('un lecteur consulte sans pouvoir saisir ni modifier', async () => {
    const project = seedBudget({ user_id: 'boss', owner_email: 'boss@test.com' });
    db.seed('project_members', { project_id: project.id, email: 'OWNER@test.com', role: 'viewer' });
    db.seed('project_transactions', { project_id: project.id, type: 'expense', label: 'Dépense', amount: 10, date: '2026-02-02', user_id: 'boss' });
    render(<Harness initialId={project.id} />);

    expect((await screen.findAllByText(/lecture seule/i)).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /Nouvelle dépense/ })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Recevoir des fonds/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Partage/ })).toBeNull();
  });

  it("quitter un budget partagé retire la ligne de membre", async () => {
    const project = seedBudget({ user_id: 'boss', owner_email: 'boss@test.com' });
    db.seed('project_members', { project_id: project.id, email: 'owner@test.com', role: 'editor' });
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click(await screen.findByRole('button', { name: /Quitter ce budget/ }));
    const buttons = screen.getAllByRole('button', { name: /Quitter ce budget/ });
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(db.tables.project_members).toHaveLength(0));
  });
});

describe('Partage', () => {
  it('invite par e-mail, refuse les adresses invalides, puis active la validation des dépenses', async () => {
    const project = seedBudget();
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click(await screen.findByRole('button', { name: /Partage/ }));

    await user.type(screen.getByPlaceholderText('prenom@exemple.com'), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: 'Inviter' }));
    expect(await screen.findByText('Adresse e-mail invalide.')).toBeTruthy();

    await user.clear(screen.getByPlaceholderText('prenom@exemple.com'));
    await user.type(screen.getByPlaceholderText('prenom@exemple.com'), 'owner@test.com');
    await user.click(screen.getByRole('button', { name: 'Inviter' }));
    expect(await screen.findByText(/votre propre adresse/)).toBeTruthy();

    await user.clear(screen.getByPlaceholderText('prenom@exemple.com'));
    await user.type(screen.getByPlaceholderText('prenom@exemple.com'), 'Compta@Test.com');
    await user.click(screen.getByRole('button', { name: 'Inviter' }));
    await waitFor(() => expect(db.tables.project_members).toHaveLength(1));
    expect(db.tables.project_members[0]).toMatchObject({ email: 'compta@test.com', role: 'editor', project_id: project.id });
    expect(await screen.findByText('compta@test.com')).toBeTruthy();

    // même personne invitée deux fois : refusé
    await user.type(screen.getByPlaceholderText('prenom@exemple.com'), 'compta@test.com');
    await user.click(screen.getByRole('button', { name: 'Inviter' }));
    expect(await screen.findByText('Cette personne a déjà accès à ce budget.')).toBeTruthy();
    expect(db.tables.project_members).toHaveLength(1);

    // validation des dépenses
    await user.click(screen.getByRole('switch', { name: 'Validation des dépenses' }));
    await waitFor(() => expect(db.tables.projects[0].requires_approval).toBe(true));

    // retirer la personne
    await user.click(screen.getByRole('button', { name: 'Retirer compta@test.com' }));
    await waitFor(() => expect(db.tables.project_members).toHaveLength(0));
  });
});

describe('Justificatifs', () => {
  it("joint un PDF à une dépense, l'affiche dans le journal et le consulte", async () => {
    const project = seedBudget();
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click((await screen.findAllByRole('button', { name: /Nouvelle dépense/ }))[0]);
    await user.type(screen.getByPlaceholderText('0'), '1500');
    await user.type(screen.getByPlaceholderText(/Billet de bus/), 'Fournitures');
    await user.upload(screen.getByTestId('receipt-input'), new File(['%PDF-1.4'], 'facture été.pdf', { type: 'application/pdf' }));
    expect(screen.getByText('facture été.pdf')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(db.tables.project_attachments).toHaveLength(1));
    const entry = db.tables.project_transactions[0];
    const att = db.tables.project_attachments[0];
    expect(att).toMatchObject({ project_id: project.id, entry_id: entry.id, name: 'facture été.pdf', mime: 'application/pdf' });
    expect(att.path.startsWith(`${project.id}/${entry.id}/`)).toBe(true);
    expect(att.path).not.toMatch(/[éè ]/); // nom nettoyé dans le chemin de stockage
    expect(db.files.has(att.path)).toBe(true);

    const clip = await screen.findByRole('button', { name: 'Justificatifs 1' });
    await user.click(clip);
    expect(await screen.findByText('Justificatifs de l\'écriture')).toBeTruthy();
    expect(screen.getAllByText('facture été.pdf').length).toBeGreaterThan(0);

    // suppression d'un justificatif : ligne et fichier disparaissent
    await user.click(screen.getByRole('button', { name: 'Retirer facture été.pdf' }));
    await waitFor(() => expect(db.tables.project_attachments).toHaveLength(0));
    expect(db.files.size).toBe(0);
  });

  it('refuse un format non accepté et signale un envoi en échec sans perdre la dépense', async () => {
    const project = seedBudget();
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness initialId={project.id} />);

    await user.click((await screen.findAllByRole('button', { name: /Nouvelle dépense/ }))[0]);
    await user.upload(screen.getByTestId('receipt-input'), new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' }));
    expect(await screen.findByText(/virus\.exe : format non accepté/)).toBeTruthy();
    expect(screen.queryByText('virus.exe')).toBeNull();

    db.failUploads = true;
    await user.type(screen.getByPlaceholderText('0'), '200');
    await user.type(screen.getByPlaceholderText(/Billet de bus/), 'Péage');
    await user.upload(screen.getByTestId('receipt-input'), new File(['x'], 'reçu.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/certains justificatifs n'ont pas été envoyés/)).toBeTruthy();
    expect(db.tables.project_transactions).toHaveLength(1); // la dépense est bien enregistrée
    expect(db.tables.project_attachments).toHaveLength(0);
  });

  it("l'export ZIP prévient quand il n'y a aucun justificatif", async () => {
    const project = seedBudget();
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);
    await user.click(await screen.findByRole('button', { name: /Justificatifs \(ZIP\)/ }));
    expect(await screen.findByText(/Aucun justificatif à exporter/)).toBeTruthy();
  });
});

describe('Saisie hors ligne', () => {
  it("enregistre la dépense sur l'appareil, puis l'envoie une seule fois au retour de la connexion", async () => {
    const project = seedBudget();
    setOnline(false);
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click((await screen.findAllByRole('button', { name: /Nouvelle dépense/ }))[0]);
    await user.type(screen.getByPlaceholderText('0'), '4500');
    await user.type(screen.getByPlaceholderText(/Billet de bus/), 'Taxi aéroport');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    // rien n'est parti vers la base, mais la dépense est visible et en file d'attente
    await waitFor(() => expect(localStorage.getItem('fintrack.offline.v1.u1')).not.toBeNull());
    expect(db.tables.project_transactions).toHaveLength(0);
    expect(screen.getAllByText('Taxi aéroport').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 écriture\(s\) en attente de synchronisation/).length).toBeGreaterThan(0);
    const queued = JSON.parse(localStorage.getItem('fintrack.offline.v1.u1')!);
    expect(queued).toHaveLength(1);

    // retour de la connexion : envoi automatique
    setOnline(true);
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(db.tables.project_transactions).toHaveLength(1));
    expect(db.tables.project_transactions[0]).toMatchObject({ id: queued[0].id, label: 'Taxi aéroport', amount: 4500, project_id: project.id });
    await waitFor(() => expect(localStorage.getItem('fintrack.offline.v1.u1')).toBeNull());
    await waitFor(() => expect(screen.queryByText(/en attente de synchronisation/)).toBeNull());
    expect(moneyTexts(4500).length).toBeGreaterThan(0);

    // un deuxième événement « online » ne crée pas de doublon
    window.dispatchEvent(new Event('online'));
    await new Promise(r => setTimeout(r, 50));
    expect(db.tables.project_transactions).toHaveLength(1);
  });

  it('reprend au démarrage une file laissée par une session précédente', async () => {
    const project = seedBudget();
    localStorage.setItem('fintrack.offline.v1.u1', JSON.stringify([{
      id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', project_id: project.id, category_id: null, type: 'expense',
      label: 'Repas client', amount: 8000, date: '2026-03-01', payee: '', reference: '', payment_method: '', note: '',
      queuedAt: '2026-03-01T10:00:00.000Z',
    }]));
    render(<Harness initialId={project.id} />);

    await waitFor(() => expect(db.tables.project_transactions).toHaveLength(1));
    expect(db.tables.project_transactions[0].id).toBe('11111111-1111-4111-8111-111111111111');
    await waitFor(() => expect(localStorage.getItem('fintrack.offline.v1.u1')).toBeNull());
  });
});

describe('Historique', () => {
  it("affiche en clair qui a fait quoi", async () => {
    const project = seedBudget();
    db.seed('project_audit_log', { project_id: project.id, actor_email: 'compta@test.com', action: 'entry_approved', details: { label: 'Taxi', amount: 300 } });
    db.seed('project_audit_log', { project_id: project.id, actor_email: 'owner@test.com', action: 'member_invited', details: { email: 'compta@test.com', role: 'editor' } });
    db.seed('project_audit_log', { project_id: project.id, actor_email: 'owner@test.com', action: 'approval_setting_changed', details: { requires_approval: true } });
    const user = userEvent.setup();
    render(<Harness initialId={project.id} />);

    await user.click(await screen.findByRole('button', { name: /Historique/ }));
    expect(await screen.findByText(/a validé « Taxi »/)).toBeTruthy();
    expect(screen.getByText(/a invité compta@test\.com \(Saisie\)/)).toBeTruthy();
    expect(screen.getByText(/a activé la validation des dépenses/)).toBeTruthy();
  });
});

describe('Rapports de période', () => {
  it("compare la période à la précédente et filtre par type de budget", async () => {
    const today = new Date();
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const pro = seedBudget({ name: 'Mission Douala', scope: 'professional', target_amount: 5000 });
    const perso = seedBudget({ name: 'Vacances', scope: 'personal', target_amount: 2000 });
    db.seed('project_transactions', { project_id: pro.id, type: 'expense', label: 'Hôtel', amount: 100, date: todayISO() });
    db.seed('project_transactions', { project_id: pro.id, type: 'expense', label: 'Hôtel (mois dernier)', amount: 40, date: iso(prev) });
    db.seed('project_transactions', { project_id: perso.id, type: 'expense', label: 'Plage', amount: 60, date: todayISO() });
    const user = userEvent.setup();
    render(<Harness initialId="reports" />);

    expect(await screen.findByRole('heading', { name: 'Rapports de période' })).toBeTruthy();
    expect((await screen.findAllByText('Mission Douala')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vacances').length).toBeGreaterThan(0);
    expect(moneyTexts(160).length).toBeGreaterThan(0); // dépensé sur la période, tous budgets
    expect(screen.getAllByText('+300%').length).toBeGreaterThan(0); // 160 vs 40

    await user.selectOptions(screen.getByDisplayValue('Perso et Pro'), 'personal');
    await waitFor(() => expect(screen.queryAllByText('Mission Douala')).toHaveLength(0));
    expect(screen.getAllByText('Vacances').length).toBeGreaterThan(0);
  });

  it("n'inclut pas les budgets partagés par défaut", async () => {
    seedBudget({ name: 'Le mien' });
    seedBudget({ name: "Celui d'un autre", user_id: 'boss' });
    db.seed('project_members', { project_id: db.tables.projects[1].id, email: 'owner@test.com', role: 'viewer' });
    const user = userEvent.setup();
    render(<Harness initialId="reports" />);

    expect((await screen.findAllByText('Le mien')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Celui d'un autre")).toHaveLength(0);
    await user.click(screen.getByRole('checkbox', { name: /Inclure les budgets partagés/ }));
    expect((await screen.findAllByText("Celui d'un autre")).length).toBeGreaterThan(0);
  });
});

describe('Liste des budgets', () => {
  it('sépare mes budgets de ceux partagés avec moi', async () => {
    seedBudget({ name: 'Le mien' });
    const other = seedBudget({ name: 'Budget du patron', user_id: 'boss', owner_email: 'boss@test.com' });
    db.seed('project_members', { project_id: other.id, email: 'owner@test.com', role: 'editor' });
    const user = userEvent.setup();
    render(<Harness />);

    expect(await screen.findByText('Le mien')).toBeTruthy();
    expect(screen.queryByText('Budget du patron')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Partagés avec moi/ }));
    const card = (await screen.findByText('Budget du patron')).closest('div[class*="cursor-pointer"]') as HTMLElement;
    expect(within(card).getByText(/Partagé par boss@test\.com/)).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'Supprimer' })).toBeNull();
  });
});
