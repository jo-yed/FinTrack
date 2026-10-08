import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useLanguage } from '../../i18n';
import { useRegion } from '../../hooks/useRegion';
import { downloadCsv } from '../../lib/csv';
import { formatDateShort, todayISO } from '../../lib/dates';
import { buildPeriodReport, periodRange, variationPercent } from '../../lib/reports';
import type { PeriodPreset } from '../../lib/reports';
import type { PageId } from '../../types';
import { SCOPE_STYLE, STATUS_PILL, inputCls, labelCls } from './shared';
import { usageStatus } from '../../lib/budgets';

interface Props {
  onNavigate: (page: PageId, param?: string | null) => void;
}

const PRESETS: PeriodPreset[] = ['thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'lastYear', 'custom'];

/** Rapports de période : prévu vs réalisé sur tous les budgets Perso & Pro, avec comparaison à la période précédente. */
export const ActivityReports: React.FC<Props> = ({ onNavigate }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { userId, projects, categories, entries } = useActivityBudgets();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  const [preset, setPreset] = useState<PeriodPreset>('thisMonth');
  const [customFrom, setCustomFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [customTo, setCustomTo] = useState(todayISO());
  const [scope, setScope] = useState<'all' | 'personal' | 'professional'>('all');
  const [includeShared, setIncludeShared] = useState(false);

  const range = useMemo(
    () => (preset === 'custom' ? { from: customFrom, to: customTo } : periodRange(preset)),
    [preset, customFrom, customTo],
  );
  const validRange = range.from !== '' && range.to !== '' && range.from <= range.to;

  const selected = useMemo(
    () => projects.filter(p => p.scope !== 'family'
      && (scope === 'all' || p.scope === scope)
      && (includeShared || p.user_id === userId)),
    [projects, scope, includeShared, userId],
  );

  const report = useMemo(
    () => buildPeriodReport({
      projects: selected,
      categories,
      entries,
      range: validRange ? range : { from: todayISO(), to: todayISO() },
    }),
    [selected, categories, entries, range, validRange],
  );

  const periodLabel = `${formatDateShort(report.range.from, locale)} → ${formatDateShort(report.range.to, locale)}`;
  const previousLabel = `${formatDateShort(report.previous.from, locale)} → ${formatDateShort(report.previous.to, locale)}`;
  const totalVariation = variationPercent(report.totals.spent, report.totals.spentPrev);

  const catName = (name: string) => name || t('periodReports.uncategorized');

  const exportCsv = () => {
    const pct = (cur: number, prev: number) => { const v = variationPercent(cur, prev); return v === null ? '' : v; };
    const rows: unknown[][] = [
      [t('periodReports.reportTitle')],
      [t('periodReports.period'), report.range.from, report.range.to],
      [t('periodReports.previous'), report.previous.from, report.previous.to],
      [t('periodReports.generatedOn'), todayISO()],
      [],
      [t('periodReports.budget'), 'Code', t('activities.scopeLabel'), t('periodReports.planned'), t('periodReports.funds'), t('periodReports.spentPeriod'), t('periodReports.spentPrev'), `${t('periodReports.variation')} %`, t('periodReports.spentTotal'), t('periodReports.remaining'), `${t('periodReports.usage')} %`, t('periodReports.pending')],
      ...report.rows.map(r => [
        r.name, r.code, t(`activities.${r.scope}`), r.planned, r.funds, r.spent, r.spentPrev, pct(r.spent, r.spentPrev),
        r.spentTotal, r.remaining, Math.round(r.progress), r.pending,
      ]),
      [t('periodReports.totals'), '', '', report.totals.planned, report.totals.funds, report.totals.spent, report.totals.spentPrev,
        pct(report.totals.spent, report.totals.spentPrev), report.totals.spentTotal, report.totals.remaining, '', report.totals.pending],
      [],
      [t('periodReports.byCategory')],
      [t('periodReports.category'), t('periodReports.spentPeriod'), t('periodReports.spentPrev'), `${t('periodReports.variation')} %`, t('periodReports.entries')],
      ...report.categories.map(c => [catName(c.name), c.spent, c.spentPrev, pct(c.spent, c.spentPrev), c.count]),
      [],
      [t('periodReports.note')],
    ];
    downloadCsv(`rapport-budgets-${report.range.from}_${report.range.to}.csv`, rows);
  };

  const Variation: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
    const v = variationPercent(current, previous);
    if (v === null) return <span className="text-gray-400">—</span>;
    // Pour des dépenses, une hausse est défavorable
    const bad = v > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 font-medium ${v === 0 ? 'text-gray-500' : bad ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {v > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : v < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
        {v > 0 ? '+' : ''}{v}%
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto print:hidden">
        <div className="animate-fade-in">
          <button onClick={() => onNavigate('activities')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('periodReports.back')}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('periodReports.title')}</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('periodReports.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCsv} disabled={!validRange} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" /> {t('periodReports.exportCsv')}
              </button>
              <button onClick={() => window.print()} disabled={!validRange} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                <Printer className="w-4 h-4" /> {t('periodReports.print')}
              </button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 animate-slide-up">
          <div>
            <label className={labelCls}>{t('periodReports.period')}</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-xl transition-all ${preset === p ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {t(`periodReports.presets.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className={labelCls}>{t('periodReports.from')}</label>
                <input type="date" className={inputCls} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t('periodReports.to')}</label>
                <input type="date" className={inputCls} value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className={labelCls}>{t('periodReports.scope')}</label>
              <select className={`${inputCls} sm:w-56`} value={scope} onChange={e => setScope(e.target.value as typeof scope)}>
                <option value="all">{t('periodReports.allScopes')}</option>
                <option value="personal">{t('activities.personal')}</option>
                <option value="professional">{t('activities.professional')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none pb-2.5">
              <input type="checkbox" className="rounded border-gray-300" checked={includeShared} onChange={e => setIncludeShared(e.target.checked)} />
              {t('periodReports.includeShared')}
            </label>
          </div>

          {validRange && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {periodLabel} · {t('periodReports.previous')} : {previousLabel}
            </p>
          )}
        </div>

        {!validRange ? null : report.rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('periodReports.noData')}
          </div>
        ) : (
          <>
            {/* Synthèse */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              <Card label={t('periodReports.spentPeriod')} value={formatCurrency(report.totals.spent)} extra={<Variation current={report.totals.spent} previous={report.totals.spentPrev} />} tone="text-red-600 dark:text-red-400" />
              <Card label={t('periodReports.funds')} value={formatCurrency(report.totals.funds)} tone="text-emerald-600 dark:text-emerald-400" />
              <Card label={t('periodReports.remaining')} value={formatCurrency(report.totals.remaining)} tone={report.totals.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'} sub={`${t('periodReports.planned')} : ${formatCurrency(report.totals.planned)}`} />
              <Card label={t('periodReports.pending')} value={formatCurrency(report.totals.pending)} tone="text-violet-600 dark:text-violet-400" />
            </div>

            {/* Par budget */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/40">
                      <th className="text-left font-medium px-5 py-2.5">{t('periodReports.budget')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.planned')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.funds')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.spentPeriod')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.spentPrev')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.variation')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.spentTotal')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.remaining')}</th>
                      <th className="text-right font-medium px-3 py-2.5">{t('periodReports.usage')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {report.rows.map(r => {
                      const st = SCOPE_STYLE[r.scope];
                      const status = usageStatus(r.spentTotal, r.planned > 0 ? r.planned : r.funds);
                      return (
                        <tr key={r.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer" onClick={() => onNavigate('activities', r.projectId)}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                              <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                              {r.code && <span className="text-xs text-gray-400">#{r.code}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatCurrency(r.planned)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(r.funds)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(r.spent)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-500">{formatCurrency(r.spentPrev)}</td>
                          <td className="px-3 py-3 text-right"><Variation current={r.spent} previous={r.spentPrev} /></td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatCurrency(r.spentTotal)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums font-medium ${r.remaining < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(r.remaining)}</td>
                          <td className="px-3 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_PILL[status]}`}>{Math.round(r.progress)}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold text-gray-900 dark:text-white">
                      <td className="px-5 py-3">{t('periodReports.totals')}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.planned)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.funds)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.spent)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.spentPrev)}</td>
                      <td className="px-3 py-3 text-right">{totalVariation === null ? '—' : `${totalVariation > 0 ? '+' : ''}${totalVariation}%`}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.spentTotal)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(report.totals.remaining)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Par catégorie */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
              <h2 className="text-base font-bold text-gray-900 dark:text-white p-5 border-b border-gray-100 dark:border-gray-800">{t('periodReports.byCategory')}</h2>
              {report.categories.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 dark:text-gray-400">{t('periodReports.noExpenses')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/40">
                        <th className="text-left font-medium px-5 py-2.5">{t('periodReports.category')}</th>
                        <th className="text-right font-medium px-3 py-2.5">{t('periodReports.spentPeriod')}</th>
                        <th className="text-right font-medium px-3 py-2.5">{t('periodReports.spentPrev')}</th>
                        <th className="text-right font-medium px-3 py-2.5">{t('periodReports.variation')}</th>
                        <th className="text-right font-medium px-3 py-2.5">{t('periodReports.entries')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {report.categories.map(c => (
                        <tr key={c.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{catName(c.name)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(c.spent)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-500">{formatCurrency(c.spentPrev)}</td>
                          <td className="px-3 py-3 text-right"><Variation current={c.spent} previous={c.spentPrev} /></td>
                          <td className="px-3 py-3 text-right text-gray-500">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <p className="text-xs text-gray-400">{t('periodReports.note')}</p>
          </>
        )}
      </div>

      {/* Version imprimable (noir sur blanc) */}
      {validRange && (
        <div className="hidden print:block text-black bg-white text-[11px] leading-snug">
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
            <div>
              <h1 className="text-lg font-bold">{t('periodReports.reportTitle')}</h1>
              <p>{periodLabel}</p>
              <p>{t('periodReports.previous')} : {previousLabel}</p>
            </div>
            <p className="text-right">FinTrack<br />{t('periodReports.generatedOn')} {new Date().toLocaleDateString(locale)}</p>
          </div>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr>
                {['budget', 'planned', 'funds', 'spentPeriod', 'spentPrev', 'spentTotal', 'remaining'].map((k, i) => (
                  <th key={k} className={`border border-gray-400 px-2 py-1 bg-gray-100 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{t(`periodReports.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map(r => (
                <tr key={r.projectId}>
                  <td className="border border-gray-300 px-2 py-1">{r.name}{r.code ? ` (#${r.code})` : ''}</td>
                  {[r.planned, r.funds, r.spent, r.spentPrev, r.spentTotal, r.remaining].map((n, i) => (
                    <td key={i} className="border border-gray-300 px-2 py-1 text-right tabular-nums">{formatCurrency(n)}</td>
                  ))}
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-gray-300 px-2 py-1">{t('periodReports.totals')}</td>
                {[report.totals.planned, report.totals.funds, report.totals.spent, report.totals.spentPrev, report.totals.spentTotal, report.totals.remaining].map((n, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1 text-right tabular-nums">{formatCurrency(n)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          {report.categories.length > 0 && (
            <>
              <h2 className="font-bold text-sm mb-1">{t('periodReports.byCategory')}</h2>
              <table className="w-full border-collapse mb-3">
                <thead>
                  <tr>
                    {['category', 'spentPeriod', 'spentPrev', 'entries'].map((k, i) => (
                      <th key={k} className={`border border-gray-400 px-2 py-1 bg-gray-100 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{t(`periodReports.${k}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map(c => (
                    <tr key={c.name}>
                      <td className="border border-gray-300 px-2 py-1">{catName(c.name)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{formatCurrency(c.spent)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{formatCurrency(c.spentPrev)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="italic">{t('periodReports.note')}</p>
        </div>
      )}
    </>
  );
};

const Card: React.FC<{ label: string; value: string; sub?: string; tone: string; extra?: React.ReactNode }> = ({ label, value, sub, tone, extra }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
    <p className={`text-xl lg:text-2xl font-bold ${tone}`}>{value}</p>
    {extra && <div className="text-xs mt-1">{extra}</div>}
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);
