import React, { useState } from 'react';
import { screen } from '@testing-library/react';
import { LanguageProvider } from '../i18n';
import { RegionProvider } from '../hooks/useRegion';
import { TransactionsProvider } from '../hooks/useTransactions';
import { AccountsProvider } from '../hooks/useAccounts';
import { ActivityBudgetsProvider } from '../hooks/useActivityBudgets';
import { ActivityBudgets } from '../components/Activities/ActivityBudgets';

/** Page « Budgets Perso & Pro » avec ses fournisseurs de données, et navigation interne simulée. */
export const Harness: React.FC<{ initialId?: string | null }> = ({ initialId = null }) => {
  const [id, setId] = useState<string | null>(initialId);
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

export const money = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// Intl insère des espaces insécables fines : on compare sans aucun espace.
const norm = (x: string) => x.replace(/[\s  ]/g, '');
export const moneyTexts = (n: number) => screen.queryAllByText(content => norm(content) === norm(money(n)));

export const ME = { id: 'u1', email: 'owner@test.com' };
