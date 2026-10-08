import React from 'react';
import type { BudgetSummary, JournalLine } from '../../lib/budgets';
import { formatDateShort } from '../../lib/dates';
import type { Project, ProjectCategory } from '../../types';

interface Props {
  project: Project;
  summary: BudgetSummary;
  journal: JournalLine[];
  categories: ProjectCategory[];
  t: (key: string) => string;
  locale: string;
  money: (n: number) => string;
}

/** Version imprimable (noir sur blanc) : visible uniquement à l'impression / export PDF. */
export const BudgetReport: React.FC<Props> = ({ project, summary, journal, categories, t, locale, money }) => {
  const catName = (id: string | null) => categories.find(c => c.id === id)?.name ?? t('activities.uncategorized');
  const th = 'border border-gray-400 px-2 py-1 text-left font-semibold bg-gray-100';
  const td = 'border border-gray-300 px-2 py-1';
  const num = 'text-right tabular-nums';

  return (
    <div className="hidden print:block text-black bg-white text-[11px] leading-snug">
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
        <div>
          <h1 className="text-lg font-bold">{t('activities.reportTitle')} — {project.name}</h1>
          <p>
            {project.scope === 'family' ? t('activities.family') : t(`activities.${project.scope}`)}
            {project.code && ` · ${project.code}`}
            {project.responsible && ` · ${t('activities.responsibleLabel')} : ${project.responsible}`}
          </p>
          {(project.start_date || project.end_date) && (
            <p>
              {project.start_date && formatDateShort(project.start_date, locale)}
              {project.start_date && project.end_date && ' → '}
              {project.end_date && formatDateShort(project.end_date, locale)}
            </p>
          )}
          {project.description && <p className="italic">{project.description}</p>}
        </div>
        <p className="text-right">FinTrack<br />{t('activities.generatedOn')} {new Date().toLocaleDateString(locale)}</p>
      </div>

      <table className="w-full border-collapse mb-4">
        <tbody>
          <tr>
            <td className={td}>{t('activities.planned')}</td><td className={`${td} ${num}`}>{money(summary.target)}</td>
            <td className={td}>{t('activities.funds')}</td><td className={`${td} ${num}`}>{money(summary.funds)}</td>
          </tr>
          <tr>
            <td className={td}>{t('activities.spent')}</td><td className={`${td} ${num}`}>{money(summary.spent)}</td>
            <td className={td}>{t('activities.cash')}</td><td className={`${td} ${num}`}>{money(summary.cashBalance)}</td>
          </tr>
          <tr>
            <td className={td}>{t('activities.remaining')}</td><td className={`${td} ${num}`}>{money(summary.remainingToSpend)}</td>
            <td className={td}>{t('activities.usage')}</td><td className={`${td} ${num}`}>{Math.round(summary.progress)}%</td>
          </tr>
        </tbody>
      </table>

      <h2 className="font-bold text-sm mb-1">{t('activities.categoriesTable')}</h2>
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr>
            <th className={th}>{t('activities.category')}</th>
            <th className={`${th} ${num}`}>{t('activities.plannedShort')}</th>
            <th className={`${th} ${num}`}>{t('activities.spentShort')}</th>
            <th className={`${th} ${num}`}>{t('activities.remainingShort')}</th>
            <th className={`${th} ${num}`}>%</th>
          </tr>
        </thead>
        <tbody>
          {summary.categories.map(c => (
            <tr key={c.id}>
              <td className={td}>{c.name}</td>
              <td className={`${td} ${num}`}>{money(c.allocated)}</td>
              <td className={`${td} ${num}`}>{money(c.spent)}</td>
              <td className={`${td} ${num}`}>{money(c.remaining)}</td>
              <td className={`${td} ${num}`}>{c.allocated > 0 ? `${Math.round(c.progress)}%` : '—'}</td>
            </tr>
          ))}
          {summary.uncategorized.count > 0 && (
            <tr>
              <td className={td}>{t('activities.uncategorized')}</td>
              <td className={`${td} ${num}`}>—</td>
              <td className={`${td} ${num}`}>{money(summary.uncategorized.spent)}</td>
              <td className={`${td} ${num}`}>—</td>
              <td className={`${td} ${num}`}>—</td>
            </tr>
          )}
          <tr className="font-bold">
            <td className={td}>{t('activities.total')}</td>
            <td className={`${td} ${num}`}>{money(summary.allocatedTotal)}</td>
            <td className={`${td} ${num}`}>{money(summary.spent)}</td>
            <td className={`${td} ${num}`}>{money(summary.remainingToSpend)}</td>
            <td className={`${td} ${num}`}>{Math.round(summary.progress)}%</td>
          </tr>
        </tbody>
      </table>

      <h2 className="font-bold text-sm mb-1">{t('activities.journal')}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>{t('activities.date')}</th>
            <th className={th}>{t('activities.label')}</th>
            <th className={th}>{t('activities.category')}</th>
            <th className={th}>{t('activities.payee')}</th>
            <th className={th}>{t('activities.reference')}</th>
            <th className={th}>{t('activities.method')}</th>
            <th className={`${th} ${num}`}>{t('activities.inColumn')}</th>
            <th className={`${th} ${num}`}>{t('activities.outColumn')}</th>
            <th className={`${th} ${num}`}>{t('activities.balance')}</th>
          </tr>
        </thead>
        <tbody>
          {journal.map(({ entry, balance }) => (
            <tr key={entry.id} style={{ breakInside: 'avoid' }}>
              <td className={td}>{formatDateShort(entry.date, locale)}</td>
              <td className={td}>{entry.label}</td>
              <td className={td}>{entry.type === 'expense' ? catName(entry.category_id) : '—'}</td>
              <td className={td}>{entry.payee}</td>
              <td className={td}>{entry.reference}</td>
              <td className={td}>{entry.payment_method ? t(`activities.methods.${entry.payment_method}`) : ''}</td>
              <td className={`${td} ${num}`}>{entry.type === 'income' ? money(entry.amount) : ''}</td>
              <td className={`${td} ${num}`}>{entry.type === 'expense' ? money(entry.amount) : ''}</td>
              <td className={`${td} ${num}`}>{money(balance)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={td} colSpan={6}>{t('activities.total')}</td>
            <td className={`${td} ${num}`}>{money(summary.funds)}</td>
            <td className={`${td} ${num}`}>{money(summary.spent)}</td>
            <td className={`${td} ${num}`}>{money(summary.cashBalance)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
