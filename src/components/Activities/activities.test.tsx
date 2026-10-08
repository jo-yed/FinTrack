// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (table: string) => db.from(table) },
  isSupabaseConfigured: true,
}));

import { LanguageProvider } from '../../i18n';
import { RegionProvider } from '../../hooks/useRegion';
import { TransactionsProvider } from '../../hooks/useTransactions';
import { AccountsProvider } from '../../hooks/useAccounts';
import { ActivityBudgetsProvider } from '../../hooks/useActivityBudgets';
import { ActivityBudgets } from './ActivityBudgets';

const money = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// Intl insère des espaces insécables fines : on compare sans aucun espace.
const norm = (x: string) => x.replace(/[\s  ]/g, '');
const moneyTexts = (n: number) => screen.queryAllByText(content => norm(content) === norm(money(n)));

const Harness: React.FC = () => {
  const [id, setId] = useState<string | null>(null);
  return (
    <LanguageProvider>
      <RegionProvider>
        <TransactionsProvider>
          <AccountsProvider>
            <ActivityBudgetsProvider>
              <ActivityBudgets budgetId={id} onNavigate={(page, param) => { if (page === 'activities') setId(param ?? null); }} />
            </ActivityBudgetsProvider>
          </AccountsProvider>
        </TransactionsProvider>
      </RegionProvider>
    </LanguageProvider>
  );
};

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  localStorage.clear();
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

afterEach(() => cleanup());

describe('Budgets Perso & Pro — parcours complet', () => {
  it('crée un budget pro avec catégories et fonds liés à un compte, enregistre des dépenses et suit le reste', async () => {
    const account = db.seed('accounts', { name: 'Compte courant', balance: 500000 });
    const user = userEvent.setup();
    render(<Harness />);

    // État vide + création
    await user.click((await screen.findAllByRole('button', { name: /Nouveau budget|Ouvrir mon premier budget/ }))[0]);

    const proButtons = screen.getAllByRole('button', { name: /Professionnel/ });
    await user.click(proButtons[proButtons.length - 1]); // le bouton de la fenêtre de création est le dernier
    await user.type(screen.getByPlaceholderText(/Mission Douala/), 'Mission Douala');
    await user.type(screen.getByPlaceholderText('Ex: BUD-2026-014'), 'BUD-1');
    await user.type(screen.getByPlaceholderText('0'), '200000');

    // Catégories : suggestions + montants
    await user.click(screen.getByRole('button', { name: /\+ Déplacements/ }));
    await user.click(screen.getByRole('button', { name: /\+ Fournitures/ }));
    const amountInputs = screen.getAllByPlaceholderText('Montant prévu');
    await user.type(amountInputs[0], '100000');
    await user.type(amountInputs[1], '50000');

    // Fonds initiaux depuis le compte
    await user.type(screen.getByPlaceholderText('Montant'), '150000');
    await user.selectOptions(await screen.findByDisplayValue('Ne pas lier à un compte'), account.id);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    // Détail du budget affiché
    expect(await screen.findByRole('heading', { name: 'Mission Douala' })).toBeTruthy();
    await waitFor(() => expect(moneyTexts(150000).length).toBeGreaterThan(0)); // solde en caisse & fonds

    // Base de données : budget, catégories, écriture de fonds liée, décaissement dans les transactions
    expect(db.tables.projects).toHaveLength(1);
    expect(db.tables.projects[0]).toMatchObject({ scope: 'professional', code: 'BUD-1', target_amount: 200000 });
    expect(db.tables.project_categories.map(c => c.name)).toEqual(['Déplacements', 'Fournitures']);
    expect(db.tables.transactions).toHaveLength(1);
    expect(db.tables.transactions[0]).toMatchObject({ type: 'expense', category: 'Budgets activités', amount: 150000, account_id: account.id });
    expect(db.tables.project_transactions[0]).toMatchObject({ type: 'income', amount: 150000, source_transaction_id: db.tables.transactions[0].id });

    // Première dépense
    await user.click(screen.getAllByRole('button', { name: /Nouvelle dépense/ })[0]);
    await user.type(screen.getByPlaceholderText('0'), '40000');
    await user.type(screen.getByPlaceholderText(/Billet de bus/), 'Billet de bus');
    await user.click(screen.getByRole('button', { name: 'Déplacements' }));
    await user.type(screen.getByPlaceholderText('Ex: Garage Atangana'), 'Garage Atangana');
    await user.type(screen.getByPlaceholderText('Ex: FAC-2026-118'), 'FAC-7');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(db.tables.project_transactions).toHaveLength(2));
    const expense = db.tables.project_transactions.find(e => e.type === 'expense')!;
    expect(expense).toMatchObject({ amount: 40000, payee: 'Garage Atangana', reference: 'FAC-7' });
    expect(expense.category_id).toBe(db.tables.project_categories[0].id);

    // Le journal et les indicateurs sont à jour : dépensé 40 000, reste sur le budget 160 000, caisse 110 000
    await waitFor(() => expect(moneyTexts(40000).length).toBeGreaterThan(0));
    expect(moneyTexts(160000).length).toBeGreaterThan(0);
    expect(moneyTexts(110000).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Garage Atangana').length).toBeGreaterThan(0); // journal + rapport imprimable

    // Dépassement de catégorie : avertissement non bloquant
    await user.click(screen.getAllByRole('button', { name: /Nouvelle dépense/ })[0]);
    await user.type(screen.getByPlaceholderText('0'), '90000');
    await user.click(screen.getByRole('button', { name: 'Déplacements' }));
    expect(await screen.findByText(/dépasse le montant prévu de « Déplacements »/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    // Suppression de l'écriture de fonds => le décaissement lié disparaît aussi des transactions
    const fundsRow = screen.getAllByText('Fonds initiaux')[0].closest('tr')!; // 1er = journal à l'écran
    await user.click(within(fundsRow).getByRole('button', { name: 'Supprimer' }));
    const dialogButtons = screen.getAllByRole('button', { name: 'Supprimer' });
    await user.click(dialogButtons[dialogButtons.length - 1]);
    await waitFor(() => expect(db.tables.transactions).toHaveLength(0));
    expect(db.tables.project_transactions).toHaveLength(1);
  });

  it('refuse une catégorie en double dans un même budget', async () => {
    const project = db.seed('projects', { name: 'Budget test', scope: 'personal' });
    db.seed('project_categories', { project_id: project.id, name: 'Transport' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByText('Budget test'));
    await user.click((await screen.findAllByRole('button', { name: /Ajouter une catégorie/ }))[0]);
    await user.keyboard('transport'); // le champ du nom a le focus automatique
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/Une catégorie porte déjà ce nom/)).toBeTruthy();
    expect(db.tables.project_categories).toHaveLength(1);
  });

  it('supprimer une catégorie conserve les dépenses en « Sans catégorie »', async () => {
    const project = db.seed('projects', { name: 'Budget test', scope: 'personal', target_amount: 1000 });
    const cat = db.seed('project_categories', { project_id: project.id, name: 'Santé', allocated_amount: 500 });
    db.seed('project_transactions', { project_id: project.id, category_id: cat.id, type: 'expense', label: 'Pharmacie', amount: 120, date: '2026-02-01' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByText('Budget test'));
    const row = (await screen.findAllByText('Santé'))[0].closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Supprimer' }));
    const buttons = screen.getAllByRole('button', { name: 'Supprimer' });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(db.tables.project_categories).toHaveLength(0));
    expect(db.tables.project_transactions[0].category_id).toBeNull();
    expect((await screen.findAllByText('Sans catégorie')).length).toBeGreaterThan(0);
  });

  it('clôturer un budget le rend en lecture seule (plus de bouton dépense)', async () => {
    const project = db.seed('projects', { name: 'Budget test', scope: 'personal' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByText('Budget test'));
    await user.click(await screen.findByRole('button', { name: /Clôturer/ }));
    await waitFor(() => expect(db.tables.projects.find(p => p.id === project.id)!.status).toBe('completed'));
    await waitFor(() => expect(screen.queryAllByRole('button', { name: /^Nouvelle dépense$/ })).toHaveLength(0));
    expect(screen.getByRole('button', { name: /Rouvrir/ })).toBeTruthy();
  });
});
