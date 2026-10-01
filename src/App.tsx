import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/Auth/AuthForm';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { CommandPalette } from './components/Layout/CommandPalette';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TransactionList } from './components/Transactions/TransactionList';
import { BudgetList } from './components/Budgets/BudgetList';
import { Reports } from './components/Reports/Reports';
import { VaultList } from './components/Vault/VaultList';
import { GoalList } from './components/Goals/GoalList';
import { FamilyList } from './components/Family/FamilyList';
import { AccountList } from './components/Accounts/AccountList';
import { Settings } from './components/Settings/Settings';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './i18n';
import { Wallet, Loader2 } from 'lucide-react';
import type { PageId } from './types';

function App() {
  const { session, loading } = useAuth();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [quickAddTx, setQuickAddTx] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'n' && !cmdOpen && session) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          e.preventDefault();
          setQuickAddTx(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, session]);

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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenCommand={() => setCmdOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === 'transactions' && <TransactionList quickAddSignal={quickAddTx} onQuickAddConsumed={() => setQuickAddTx(false)} />}
          {currentPage === 'budgets' && <BudgetList />}
          {currentPage === 'reports' && <Reports />}
          {currentPage === 'vault' && <VaultList />}
          {currentPage === 'family' && <FamilyList />}
          {currentPage === 'accounts' && <AccountList />}
          {currentPage === 'goals' && <GoalList />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={setCurrentPage}
        onQuickAdd={() => {
          setCurrentPage('transactions');
          setQuickAddTx(true);
        }}
      />
    </div>
  );
}

export default App;
