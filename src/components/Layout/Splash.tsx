import React from 'react';
import { useLanguage } from '../../i18n';

/**
 * Écran de lancement : des pièces tombent dans un graphique de croissance, et quatre satellites tournent autour
 * du logo — la finance, la famille, le travail et la sécurité. Animations en CSS pur (définies dans index.html) :
 * le même écran s'affiche avant même que l'application soit chargée.
 */
export const Splash: React.FC = () => {
  const { t } = useLanguage();
  return (
      <div className="ft-splash" role="status" aria-live="polite" aria-label={t('common.loading')}>
        <div className="ft-stage">
          <div className="ft-glow"></div><div className="ft-ring"></div>
          <div className="ft-orbit ft-o1"><span className="ft-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.8c0 2.4-5 1.4-5 3.8 0 1.2 1.1 1.9 2.5 1.9s2.5-.6 2.5-1.6"/></svg></span></div>
          <div className="ft-orbit ft-o2"><span className="ft-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M17 14c2.6 0 4.5 2 4.5 4.5"/></svg></span></div>
          <div className="ft-orbit ft-o3"><span className="ft-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg></span></div>
          <div className="ft-orbit ft-o4"><span className="ft-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg></span></div>
          <svg className="ft-logo" viewBox="0 0 120 120" fill="none" aria-hidden="true"><defs><linearGradient id="ftbg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#0F172A"/><stop offset="100%" stopColor="#1E293B"/></linearGradient><linearGradient id="ftac" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#10B981"/></linearGradient></defs><rect x="6" y="6" width="108" height="108" rx="28" fill="url(#ftbg)"/><path d="M60 26 L88 42 L88 78 L60 94 L32 78 L32 42 Z" fill="none" stroke="url(#ftac)" strokeWidth="3"/><path d="M46 78 L46 42 L74 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M46 60 L66 60" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none"/><path d="M58 68 L66 58 L72 64 L82 50" stroke="url(#ftac)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M76 50 L82 50 L82 56" stroke="url(#ftac)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </div>
        <div className="ft-chart" aria-hidden="true"><b /><b /><b /><i /><i /><i /><i /><i /><i /><i /></div>
        <div className="ft-brand">FinTrack</div>
        <div className="ft-msgs"><span>{t('splash.m1')}</span><span>{t('splash.m2')}</span><span>{t('splash.m3')}</span><span>{t('splash.m4')}</span></div>
        <div className="ft-progress"><i /></div>
      </div>
  );
};
