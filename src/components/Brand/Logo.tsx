import React, { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/** Logo FinTrack « Hexagon Finance » : badge sombre, hexagone dégradé, F et flèche de croissance. */
export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => {
  const uid = useId().replace(/:/g, '');
  const bg = `lg-bg-${uid}`;
  const accent = `lg-accent-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="FinTrack"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id={accent} x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="28" fill={`url(#${bg})`} />
      <path d="M60 26 L88 42 L88 78 L60 94 L32 78 L32 42 Z" fill="none" stroke={`url(#${accent})`} strokeWidth="3" />
      <path d="M46 78 L46 42 L74 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M46 60 L66 60" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M58 68 L66 58 L72 64 L82 50" stroke={`url(#${accent})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M76 50 L82 50 L82 56" stroke={`url(#${accent})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};
