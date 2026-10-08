import React from 'react';
import type { PageId } from '../../types';
import { BudgetListView } from './BudgetListView';
import { BudgetDetail } from './BudgetDetail';
import { ActivityReports } from './ActivityReports';

interface Props {
  budgetId: string | null;
  onNavigate: (page: PageId, param?: string | null) => void;
}

/** Page « Budgets Perso & Pro » : liste des budgets, ou détail d'un budget (#/activities/<id>). */
export const ActivityBudgets: React.FC<Props> = ({ budgetId, onNavigate }) => {
  if (budgetId === 'reports') return <ActivityReports onNavigate={onNavigate} />;
  if (budgetId) return <BudgetDetail budgetId={budgetId} onNavigate={onNavigate} />;
  return <BudgetListView onNavigate={onNavigate} />;
};
