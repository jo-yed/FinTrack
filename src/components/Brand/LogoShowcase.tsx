import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface LogoProps {
  size?: number;
  variant?: 'light' | 'dark';
}

// --- Proposal 1: "Growth Pulse" ---
// An upward trending line forming an abstract F, with a subtle coin accent.
// Represents financial growth and tracking.
const Logo1GrowthPulse: React.FC<LogoProps> = ({ size = 120, variant = 'light' }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp1-grad" x1="0" y1="120" x2="120" y2="0">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <linearGradient id="lp1-grad2" x1="0" y1="0" x2="0" y2="120">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    {/* Background rounded square */}
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp1-grad)" />
    <rect x="6" y="6" width="108" height="108" rx="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    {/* F shape made from chart line */}
    <path d="M38 82 L38 38 L82 38" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Middle bar of F */}
    <path d="M38 60 L68 60" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* Upward trend arrow emerging from F */}
    <path d="M52 72 L64 60 L72 68 L88 48" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.7" />
    <path d="M80 48 L88 48 L88 56" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.7" />
    {/* Coin accent */}
    <circle cx="92" cy="86" r="10" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2" />
    <text x="92" y="91" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">€</text>
  </svg>
);

// --- Proposal 2: "Secure Shield" ---
// A wallet/card combined with a shield outline. Represents security + finance.
const Logo2SecureWallet: React.FC<LogoProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp2-grad" x1="0" y1="0" x2="120" y2="120">
        <stop offset="0%" stopColor="#1E40AF" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp2-grad)" />
    <rect x="6" y="6" width="108" height="108" rx="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    {/* Shield shape */}
    <path d="M60 28 L84 38 L84 62 Q84 82 60 92 Q36 82 36 62 L36 38 Z" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="3" />
    {/* Card inside shield */}
    <rect x="42" y="48" width="36" height="24" rx="4" fill="white" fillOpacity="0.95" />
    <rect x="46" y="52" width="12" height="4" rx="1.5" fill="#1E40AF" />
    <rect x="46" y="59" width="20" height="2.5" rx="1" fill="#3B82F6" fillOpacity="0.5" />
    <rect x="46" y="64" width="14" height="2.5" rx="1" fill="#3B82F6" fillOpacity="0.3" />
    {/* Checkmark */}
    <path d="M68 52 L72 56 L80 46" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// --- Proposal 3: "Growth Rings" ---
// Concentric arcs with an upward arrow. Represents progressive growth and goals.
const Logo3GrowthRings: React.FC<LogoProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp3-grad" x1="0" y1="120" x2="120" y2="0">
        <stop offset="0%" stopColor="#059669" />
        <stop offset="50%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp3-grad)" />
    <rect x="6" y="6" width="108" height="108" rx="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    {/* Concentric arcs */}
    <path d="M60 90 A30 30 0 0 1 30 60" stroke="white" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M60 82 A22 22 0 0 1 38 60" stroke="white" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M60 74 A14 14 0 0 1 46 60" stroke="white" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* Upward arrow through center */}
    <path d="M60 88 L60 36" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M48 48 L60 34 L72 48" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Small dots representing milestones */}
    <circle cx="60" cy="88" r="3" fill="white" />
    <circle cx="60" cy="74" r="2.5" fill="white" fillOpacity="0.7" />
  </svg>
);

// --- Proposal 4: "Track & Bar" ---
// Bar chart bars forming an F, with a trend line on top.
const Logo4TrackBar: React.FC<LogoProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp4-grad" x1="0" y1="0" x2="120" y2="120">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp4-grad)" />
    <rect x="6" y="6" width="108" height="108" rx="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    {/* Bars forming F shape */}
    <rect x="34" y="36" width="9" height="48" rx="3" fill="white" fillOpacity="0.9" />
    <rect x="34" y="36" width="40" height="9" rx="3" fill="white" fillOpacity="0.9" />
    <rect x="34" y="57" width="28" height="9" rx="3" fill="white" fillOpacity="0.75" />
    {/* Trend line crossing bars */}
    <path d="M40 72 L54 60 L62 66 L82 42" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.6" />
    {/* Arrow head */}
    <path d="M75 42 L82 42 L82 49" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.6" />
    {/* Coin at base */}
    <circle cx="82" cy="78" r="9" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2.5" />
    <path d="M82 74 L82 82 M79 77 L85 77 M79 79 L85 79" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// --- Proposal 5: "Pulse Coin" ---
// A heartbeat/pulse line that transforms into a rising chart, inside a coin circle.
const Logo5PulseCoin: React.FC<LogoProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp5-grad" x1="0" y1="0" x2="120" y2="120">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <linearGradient id="lp5-line" x1="0" y1="0" x2="120" y2="0">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp5-grad)" />
    <rect x="6" y="6" width="108" height="108" rx="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    {/* Outer ring */}
    <circle cx="60" cy="60" r="36" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
    {/* Pulse line that transitions to chart */}
    <path d="M28 62 L40 62 L46 50 L52 74 L58 56 L66 56 L72 44 L80 38 L92 32" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Arrow tip */}
    <path d="M85 32 L92 32 L92 39" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Dots along the path */}
    <circle cx="28" cy="62" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="52" cy="74" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="92" cy="32" r="2.5" fill="white" />
  </svg>
);

// --- Proposal 6: "Hexagon Finance" ---
// A hexagonal badge with an abstract F + upward arrow. Modern, tech-forward.
const Logo6HexFinance: React.FC<LogoProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lp6-grad" x1="0" y1="0" x2="120" y2="120">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
      <linearGradient id="lp6-accent" x1="0" y1="0" x2="0" y2="120">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lp6-grad)" />
    {/* Hexagon */}
    <path d="M60 26 L88 42 L88 78 L60 94 L32 78 L32 42 Z" fill="none" stroke="url(#lp6-accent)" strokeWidth="3" />
    {/* F shape */}
    <path d="M46 78 L46 42 L74 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M46 60 L66 60" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* Arrow rising from F */}
    <path d="M58 68 L66 58 L72 64 L82 50" stroke="url(#lp6-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M76 50 L82 50 L82 56" stroke="url(#lp6-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

interface Proposal {
  id: number;
  name: string;
  desc: string;
  Logo: React.FC<LogoProps>;
  colors: string;
}

const proposals: Proposal[] = [
  {
    id: 1,
    name: 'Growth Pulse',
    desc: 'Un F stylisé en graphique de croissance avec pièce. Représente le suivi financier et la progression.',
    Logo: Logo1GrowthPulse,
    colors: 'Bleu → Vert émeraude',
  },
  {
    id: 2,
    name: 'Secure Wallet',
    desc: 'Une carte bancaire protégée par un bouclier avec coche de validation. Représente la sécurité financière.',
    Logo: Logo2SecureWallet,
    colors: 'Bleu profond',
  },
  {
    id: 3,
    name: 'Growth Rings',
    desc: 'Des anneaux concentriques avec flèche ascendante. Représente la croissance progressive et les objectifs.',
    Logo: Logo3GrowthRings,
    colors: 'Vert émeraude',
  },
  {
    id: 4,
    name: 'Track & Bar',
    desc: 'Des barres de graphique formant un F avec ligne de tendance et pièce. Représente l\'analyse et le suivi.',
    Logo: Logo4TrackBar,
    colors: 'Indigo → Violet',
  },
  {
    id: 5,
    name: 'Pulse Coin',
    desc: 'Un pouls qui se transforme en graphique ascendant dans un cercle. Représente la vitalité financière.',
    Logo: Logo5PulseCoin,
    colors: 'Ambre → Orange',
  },
  {
    id: 6,
    name: 'Hexagon Finance',
    desc: 'Un hexagone moderne avec F stylisé et flèche de croissance. Représente la technologie et la fiabilité.',
    Logo: Logo6HexFinance,
    colors: 'Sombre + Bleu/Vert',
  },
];

export const LogoShowcase: React.FC<{ onPick: (id: number) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[80] bg-gray-50 dark:bg-gray-950 overflow-y-auto animate-fade-in">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Propositions de Logos — FinTrack</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Survolez pour voir en grand, cliquez sur le cœur pour valider votre choix</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <X className="w-4 h-4" />
          Fermer
        </button>
      </div>

      {/* Proposals grid */}
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((p, index) => {
          const { Logo } = p;
          const isHovered = hovered === p.id;
          return (
            <div
              key={p.id}
              className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center transition-all hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700 animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 80}ms` }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Number badge */}
              <div className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                {p.id}
              </div>

              {/* Logo */}
              <div
                className={`transition-all duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
                style={{ filter: isHovered ? 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))' : 'none' }}
              >
                <Logo size={isHovered ? 130 : 110} />
              </div>

              {/* Info */}
              <div className="mt-5 text-center w-full">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{p.name}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{p.desc}</p>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Couleurs:</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{p.colors}</span>
                </div>
              </div>

              {/* Pick button */}
              <button
                onClick={() => onPick(p.id)}
                className={`mt-5 flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all w-full justify-center ${
                  isHovered
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Check className="w-4 h-4" />
                {isHovered ? 'Valider ce logo' : 'Choisir'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="max-w-6xl mx-auto px-6 pb-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-600">
          Cliquez sur un logo pour le valider. Il sera ensuite intégré dans toute l'application (barre latérale, page de connexion, en-tête).
        </p>
      </div>
    </div>
  );
};
