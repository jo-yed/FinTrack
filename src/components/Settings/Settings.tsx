import React, { useState } from 'react';
import { User, Globe, Moon, Sun, DollarSign, Bell, Shield, LogOut, Mail, Check, ChevronRight, Tags, Plus, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../i18n';
import { useRegion } from '../../hooks/useRegion';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_CATEGORIES, useCategories } from '../../hooks/useCategories';
import { CATEGORY_COLORS } from '../../lib/budgets';
import { getBudgetAlertsEnabled, setBudgetAlertsEnabled } from '../../lib/prefs';

const CURRENCIES = [
  { code: 'XAF', label: 'FCFA', flag: '🇨🇲' },
  { code: 'EUR', label: 'Euro', flag: '🇪🇺' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸' },
];

export const Settings: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { region, setCurrency } = useRegion();
  const { session, signOut } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(getBudgetAlertsEnabled);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const showSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  };

  const userEmail = session?.user?.email || '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {userEmail.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{userEmail}</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('settings.member')}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </button>
        </div>
      </div>

      {/* Appearance */}
      <SettingsSection icon={<Sun className="w-5 h-5 text-amber-500" />} title={t('settings.appearance')} saved={savedSection === 'appearance'}>
        <SettingsRow label={t('settings.theme')} desc={t('settings.themeDesc')}>
          <div className="flex gap-2">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'light' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-2 ring-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              <Sun className="w-4 h-4" />
              {t('settings.light')}
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'dark' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              <Moon className="w-4 h-4" />
              {t('settings.dark')}
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Language */}
      <SettingsSection icon={<Globe className="w-5 h-5 text-blue-500" />} title={t('settings.language')} saved={savedSection === 'language'}>
        <SettingsRow label={t('settings.languageLabel')} desc={t('settings.languageDesc')}>
          <div className="flex gap-2">
            <button
              onClick={() => { setLang('fr'); showSaved('language'); }}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${lang === 'fr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              Français
            </button>
            <button
              onClick={() => { setLang('en'); showSaved('language'); }}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${lang === 'en' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              English
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Currency */}
      <SettingsSection icon={<DollarSign className="w-5 h-5 text-emerald-500" />} title={t('settings.currency')} saved={savedSection === 'currency'}>
        <SettingsRow label={t('settings.currencyLabel')} desc={t('settings.currencyDesc')}>
          <div className="flex gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); showSaved('currency'); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${region.currency === c.code ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-2 ring-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                <span>{c.flag}</span>
                {c.code}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Catégories personnalisées */}
      <CategoriesSection />

      {/* Notifications */}
      <SettingsSection icon={<Bell className="w-5 h-5 text-amber-500" />} title={t('settings.notifications')} saved={savedSection === 'notifications'}>
        <SettingsRow label={t('settings.budgetAlerts')} desc={t('settings.budgetAlertsDesc')}>
          <button
            onClick={() => { const next = !notifEnabled; setNotifEnabled(next); setBudgetAlertsEnabled(next); showSaved('notifications'); }}
            className={`relative w-12 h-6 rounded-full transition-colors ${notifEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </SettingsRow>
      </SettingsSection>

      {/* Security */}
      <SettingsSection icon={<Shield className="w-5 h-5 text-red-500" />} title={t('settings.security')} saved={null}>
        <SettingsRow label={t('settings.accountEmail')} desc={userEmail}>
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <Mail className="w-4 h-4" />
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
        </SettingsRow>
        <SettingsRow label={t('settings.dataStored')} desc={t('settings.dataStoredDesc')}>
          <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  saved: boolean | null;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ icon, title, saved, children }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {saved && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <Check className="w-4 h-4" />
            {t('settings.saved')}
          </div>
        )}
      </div>
      <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </div>
  );
};

interface SettingsRowProps {
  label: string;
  desc: string;
  children: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, desc, children }) => {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{desc}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
};

const CategoriesSection: React.FC = () => {
  const { t } = useLanguage();
  const { custom, addCategory, deleteCategory } = useCategories();
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const exists = [...DEFAULT_CATEGORIES, ...custom].some(c => c.type === type && c.name.toLowerCase() === clean.toLowerCase());
    if (exists) return setError(t('categoriesMgmt.duplicate'));
    try {
      await addCategory(clean, type, CATEGORY_COLORS[custom.length % CATEGORY_COLORS.length]);
      setName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Tags className="w-5 h-5 text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('categoriesMgmt.title')}</h3>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('categoriesMgmt.desc')}</p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['expense', 'income'] as const).map(tp => (
            <button key={tp} type="button" onClick={() => setType(tp)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${type === tp ? (tp === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'text-gray-500 dark:text-gray-400'}`}>
              {t(`categoriesMgmt.${tp}`)}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder={t('categoriesMgmt.name')}
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
        <button type="submit" className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t('categoriesMgmt.add')}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {custom.length === 0 ? (
        <p className="text-sm text-gray-400">{t('categoriesMgmt.none')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {custom.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
              <span className="text-[10px] uppercase text-gray-400">{t(`categoriesMgmt.${c.type}`)}</span>
              <button
                onClick={() => deleteCategory(c.id).catch(err => setError(err instanceof Error ? err.message : String(err)))}
                aria-label={t('common.delete')}
                className="p-0.5 text-gray-400 hover:text-red-500 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
