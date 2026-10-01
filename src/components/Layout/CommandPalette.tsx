import React, { useState, useEffect, useRef } from 'react';
import { Search, LayoutDashboard, CreditCard, Wallet, Target, Shield, Activity, Settings as SettingsIcon, Plus, ArrowRight, Users, Landmark } from 'lucide-react';
import { useLanguage } from '../../i18n';
import type { PageId } from '../../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onQuickAdd: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  desc: string;
  icon: React.FC<any>;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate, onQuickAdd }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'goto-dashboard', label: t('common.dashboard'), desc: t('command.gotoDashboard'), icon: LayoutDashboard, action: () => onNavigate('dashboard') },
    { id: 'goto-transactions', label: t('common.transactions'), desc: t('command.gotoTransactions'), icon: CreditCard, action: () => onNavigate('transactions') },
    { id: 'goto-budgets', label: t('budgets.title'), desc: t('command.gotoBudgets'), icon: Wallet, action: () => onNavigate('budgets') },
    { id: 'goto-reports', label: t('reports.title'), desc: t('command.gotoReports'), icon: Activity, action: () => onNavigate('reports') },
    { id: 'goto-family', label: t('family.title'), desc: t('command.gotoFamily'), icon: Users, action: () => onNavigate('family') },
    { id: 'goto-accounts', label: t('accounts.title'), desc: t('command.gotoAccounts'), icon: Landmark, action: () => onNavigate('accounts') },
    { id: 'goto-goals', label: t('common.goals'), desc: t('command.gotoGoals'), icon: Target, action: () => onNavigate('goals') },
    { id: 'goto-vault', label: t('common.vault'), desc: t('command.gotoVault'), icon: Shield, action: () => onNavigate('vault') },
    { id: 'goto-settings', label: t('common.settings'), desc: t('command.gotoSettings'), icon: SettingsIcon, action: () => onNavigate('settings') },
    { id: 'quick-add-tx', label: t('transactions.add'), desc: t('command.quickAddTx'), icon: Plus, action: onQuickAdd, shortcut: 'N' },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) {
        cmd.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-[61] w-full max-w-lg animate-scale-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('command.placeholder')}
              className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden sm:flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">
                {t('command.noResults')}
              </div>
            ) : (
              filtered.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {cmd.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{cmd.desc}</p>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
                {t('command.navigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↵</kbd>
                {t('command.select')}
              </span>
            </div>
            <span className="text-blue-500 font-medium">FinTrack</span>
          </div>
        </div>
      </div>
    </>
  );
};
