import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AuthForm } from './components/Auth/AuthForm';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { CommandPalette } from './components/Layout/CommandPalette';
import { ErrorBoundary } from './components/Layout/ErrorBoundary';
import { LogoShowcase } from './components/Brand/LogoShowcase';
import { useAuth } from './hooks/useAuth';
import { useRoute } from './hooks/useRoute';
import { useLanguage } from './i18n';
import { TransactionsProvider } from './hooks/useTransactions';
import { AccountsProvider } from './hooks/useAccounts';
import { FamilyProvider } from './hooks/useFamilyMembers';
import { CategoriesProvider } from './hooks/useCategories';
import { ActivityBudgetsProvider } from './hooks/useActivityBudgets';
import { VaultProvider } from './hooks/useVault';
import { Wallet, Loader2 } from 'lucide-react';

// Chargement différé : chaque page devient un fichier séparé (démarrage plus rapide).
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionList = lazy(() => import('./components/Transactions/TransactionList').then(m => ({ default: m.TransactionList })));
const BudgetList = lazy(() => import('./components/Budgets/BudgetList').then(m => ({ default: m.BudgetList })));
const Reports = lazy(() => import('./components/Reports/Reports').then(m => ({ default: m.Reports })));
const VaultList = lazy(() => import('./components/Vault/VaultList').then(m => ({ default: m.VaultList })));
const GoalList = lazy(() => import('./components/Goals/GoalList').then(m => ({ default: m.GoalList })));
const FamilyList = lazy(() => import('./components/Family/FamilyList').then(m => ({ default: m.FamilyList })));
const AccountList = lazy(() => import('./components/Accounts/AccountList').then(m => ({ default: m.AccountList })));
const ActivityBudgets = lazy(() => import('./components/Activities/ActivityBudgets').then(m => ({ default: m.ActivityBudgets })));
const Settings = lazy(() => import('./components/Settings/Settings').then(m => ({ default: m.Settings })));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-gray-400 dark:text-gray-500">
    <Loader2 className="w-5 h-5 animate-spin" />
  </div>
);

const Shell: React.FC = () => {
  const { route, navigate } = useRoute();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [quickAddTx, setQuickAddTx] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !cmdOpen) {
        const target = e.target as HTMLElement;
        const typing =
          target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        if (!typing) {
          e.preventDefault();
          navigate('transactions');
          setQuickAddTx(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, navigate]);

  const page = route.page;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar currentPage={page} onPageChange={p => navigate(p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenCommand={() => setCmdOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden print:p-0">
          <ErrorBoundary key={page}>
            <Suspense fallback={<PageFallback />}>
              {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
              {page === 'transactions' && (
                <TransactionList quickAddSignal={quickAddTx} onQuickAddConsumed={() => setQuickAddTx(false)} />
              )}
              {page === 'budgets' && <BudgetList />}
              {page === 'reports' && <Reports />}
              {page === 'vault' && <VaultList />}
              {page === 'family' && <FamilyList />}
              {page === 'accounts' && <AccountList />}
              {page === 'activities' && <ActivityBudgets budgetId={route.param} onNavigate={navigate} />}
              {page === 'goals' && <GoalList />}
              {page === 'settings' && <Settings />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={p => navigate(p)}
        onQuickAdd={() => {
          navigate('transactions');
          setQuickAddTx(true);
        }}
      />
    </div>
  );
};

function App() {
  const { session, loading } = useAuth();
  const { t } = useLanguage();
  const [showLogos, setShowLogos] = useState(true);

  const handlePickLogo = (id: number) => {
    console.log('User picked logo:', id);
    setShowLogos(false);
  };

  if (showLogos) {
    return <LogoShowcase onPick={handlePickLogo} onClose={() => setShowLogos(false)} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 gap-3">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  // key = changement d'utilisateur => tous les états de données repartent de zéro.
  return (
    <TransactionsProvider key={session.user.id}>
      <AccountsProvider>
        <FamilyProvider>
          <CategoriesProvider>
            <ActivityBudgetsProvider>
              <VaultProvider>
                <Shell />
              </VaultProvider>
            </ActivityBudgetsProvider>
          </CategoriesProvider>
        </FamilyProvider>
      </AccountsProvider>
    </TransactionsProvider>
  );
}

export default App;
