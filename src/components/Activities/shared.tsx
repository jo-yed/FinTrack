import React from 'react';
import {
  FolderOpen, Plane, Home, GraduationCap, Heart, Car, Gift, PartyPopper, Wrench, ShoppingBag,
  Briefcase, Truck, Laptop, Utensils, Stethoscope, Building2, Trash2, X, AlertCircle, User,
} from 'lucide-react';
import type { UsageStatus } from '../../lib/budgets';
import type { ProjectScope, ProjectStatus } from '../../types';

export const BUDGET_ICONS: { name: string; icon: React.FC<{ className?: string }> }[] = [
  { name: 'Briefcase', icon: Briefcase },
  { name: 'FolderOpen', icon: FolderOpen },
  { name: 'Plane', icon: Plane },
  { name: 'Truck', icon: Truck },
  { name: 'Laptop', icon: Laptop },
  { name: 'Building2', icon: Building2 },
  { name: 'Home', icon: Home },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Heart', icon: Heart },
  { name: 'Car', icon: Car },
  { name: 'Gift', icon: Gift },
  { name: 'PartyPopper', icon: PartyPopper },
  { name: 'Wrench', icon: Wrench },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Utensils', icon: Utensils },
  { name: 'Stethoscope', icon: Stethoscope },
];

export function getBudgetIcon(name: string): React.FC<{ className?: string }> {
  return BUDGET_ICONS.find(i => i.name === name)?.icon ?? FolderOpen;
}

/** Remplace {cle} dans un texte traduit. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), text);
}

/** Convertit une saisie (virgule ou point) en nombre ; NaN si invalide. */
export function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
}

export const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm';

export const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

export interface ScopeStyle {
  gradient: string;
  shadow: string;
  soft: string;
  text: string;
  dot: string;
  icon: React.FC<{ className?: string }>;
}

export const SCOPE_STYLE: Record<ProjectScope, ScopeStyle> = {
  personal: {
    gradient: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600',
    shadow: 'shadow-blue-500/20',
    soft: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    icon: User,
  },
  professional: {
    gradient: 'bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600',
    shadow: 'shadow-violet-500/20',
    soft: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    icon: Briefcase,
  },
  family: {
    gradient: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600',
    shadow: 'shadow-rose-500/20',
    soft: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    icon: Heart,
  },
};

export const STATUS_TEXT: Record<ProjectStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  completed: 'text-blue-600 dark:text-blue-400',
  archived: 'text-gray-400',
};

const BAR: Record<UsageStatus, string> = {
  none: 'bg-gray-300 dark:bg-gray-600',
  ok: 'bg-gradient-to-r from-emerald-400 to-teal-400',
  warning: 'bg-gradient-to-r from-amber-400 to-orange-400',
  over: 'bg-red-500',
};

export const STATUS_PILL: Record<UsageStatus, string> = {
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  ok: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  over: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

export const ProgressBar: React.FC<{ progress: number; status: UsageStatus; height?: string }> = ({
  progress, status, height = 'h-2.5',
}) => (
  <div className={`w-full bg-gray-100 dark:bg-gray-800 rounded-full ${height} overflow-hidden`}>
    <div
      className={`${height} rounded-full transition-all duration-700 ${BAR[status]}`}
      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
    />
  </div>
);

export const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ title, onClose, maxWidth = 'max-w-lg', children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full ${maxWidth} max-h-[92vh] overflow-y-auto animate-scale-in`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const ConfirmDialog: React.FC<{
  message: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, detail, confirmLabel, cancelLabel, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in print:hidden">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{message}</h3>
          {detail && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detail}</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {cancelLabel}
        </button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const ErrorToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-lg animate-slide-up max-w-sm z-[70] print:hidden">
    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
    <button onClick={onClose} className="text-red-400 hover:text-red-600 ml-2" aria-label="Fermer">
      <X className="w-4 h-4" />
    </button>
  </div>
);
