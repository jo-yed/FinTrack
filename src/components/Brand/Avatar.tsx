import React from 'react';
import { AVATAR_COLORS, DEFAULT_SKIN, SKIN_TONES, clampSkin, initialsOf } from '../../lib/avatar';
import type { AgeGroup, Gender } from '../../lib/avatar';

interface AvatarProps {
  name?: string;
  /** Couleur de fond. */
  color?: string;
  gender?: Gender | null;
  ageGroup?: AgeGroup | null;
  /** Indice du teint (0 à 4). */
  skin?: number | null;
  /** Photo (data URL) : prioritaire sur le personnage. */
  photo?: string | null;
  size?: number;
  className?: string;
}

const HAIR = '#2A211D';
const HAIR_GREY = '#CFCFD4';

interface Shape {
  cy: number;
  r: number;
  bodyTop: number;
}

const SHAPES: Record<AgeGroup, Shape> = {
  child: { cy: 30, r: 13, bodyTop: 50 },
  teen: { cy: 28, r: 11.5, bodyTop: 46 },
  adult: { cy: 27, r: 11, bodyTop: 44 },
  senior: { cy: 27, r: 11, bodyTop: 44 },
};

/** Personnage dessiné en SVG : s'adapte au sexe, à la tranche d'âge et au teint, sans aucune image à charger. */
const Character: React.FC<{ gender: Gender; age: AgeGroup; skin: string }> = ({ gender, age, skin }) => {
  const { cy, r, bodyTop } = SHAPES[age];
  const cx = 32;
  const hair = age === 'senior' ? HAIR_GREY : HAIR;
  const eyeY = cy + (age === 'child' ? 2 : 1);
  const eyeR = age === 'child' ? 1.6 : 1.25;
  const cap = `M${cx - r - 0.6} ${cy + 1.5} C${cx - r - 1.5} ${cy - r - 4} ${cx + r + 1.5} ${cy - r - 4} ${cx + r + 0.6} ${cy + 1.5} C${cx + r - 2} ${cy - r * 0.42} ${cx - r + 2} ${cy - r * 0.42} ${cx - r - 0.6} ${cy + 1.5} Z`;
  const shoulders = `M${cx - 24} 64 C${cx - 24} ${bodyTop + 6} ${cx - 12} ${bodyTop} ${cx} ${bodyTop} C${cx + 12} ${bodyTop} ${cx + 24} ${bodyTop + 6} ${cx + 24} 64 Z`;

  return (
    <>
      {/* cheveux de derrière */}
      {gender === 'f' && age !== 'child' && (
        <ellipse cx={cx} cy={cy + 5} rx={r + 3.2} ry={r + 8} fill={hair} />
      )}
      {gender === 'f' && age === 'child' && (
        <>
          <circle cx={cx - r - 2.5} cy={cy + 4} r={4.2} fill={hair} />
          <circle cx={cx + r + 2.5} cy={cy + 4} r={4.2} fill={hair} />
        </>
      )}
      {gender === 'f' && age === 'senior' && <circle cx={cx} cy={cy - r - 1.2} r={4.6} fill={hair} />}

      {/* corps et cou */}
      <path d={shoulders} fill="#FFFFFF" opacity="0.94" />
      <rect x={cx - 4} y={cy + r - 3} width="8" height={bodyTop - cy - r + 6} rx="3" fill={skin} />
      <path d={`M${cx - 6} ${bodyTop + 0.5} Q${cx} ${bodyTop + 7} ${cx + 6} ${bodyTop + 0.5}`} fill={skin} />

      {/* tête */}
      <circle cx={cx} cy={cy} r={r} fill={skin} />
      <circle cx={cx - r + 0.4} cy={cy + 2} r={2.1} fill={skin} />
      <circle cx={cx + r - 0.4} cy={cy + 2} r={2.1} fill={skin} />

      {/* cheveux de devant */}
      {!(gender === 'm' && age === 'senior') ? <path d={cap} fill={hair} /> : (
        <>
          <path d={`M${cx - r - 0.5} ${cy + 1} C${cx - r - 1} ${cy - r * 0.9} ${cx - r + 3} ${cy - r * 0.9} ${cx - r + 3.2} ${cy - 3} C${cx - r + 1.5} ${cy - 1} ${cx - r + 1} ${cy + 1} ${cx - r - 0.5} ${cy + 1} Z`} fill={hair} />
          <path d={`M${cx + r + 0.5} ${cy + 1} C${cx + r + 1} ${cy - r * 0.9} ${cx + r - 3} ${cy - r * 0.9} ${cx + r - 3.2} ${cy - 3} C${cx + r - 1.5} ${cy - 1} ${cx + r - 1} ${cy + 1} ${cx + r + 0.5} ${cy + 1} Z`} fill={hair} />
        </>
      )}

      {/* visage */}
      <circle cx={cx - 4.2} cy={eyeY} r={eyeR} fill="#2B2B33" />
      <circle cx={cx + 4.2} cy={eyeY} r={eyeR} fill="#2B2B33" />
      <path d={`M${cx - 3} ${eyeY + 5} Q${cx} ${eyeY + 7.6} ${cx + 3} ${eyeY + 5}`} stroke="#2B2B33" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {age === 'senior' && (
        <g stroke="#2B2B33" strokeWidth="0.9" fill="none">
          <circle cx={cx - 4.2} cy={eyeY} r={3.1} />
          <circle cx={cx + 4.2} cy={eyeY} r={3.1} />
          <path d={`M${cx - 1.1} ${eyeY} L${cx + 1.1} ${eyeY}`} />
        </g>
      )}
    </>
  );
};

export const Avatar: React.FC<AvatarProps> = ({ name = '', color = AVATAR_COLORS[0], gender, ageGroup, skin, photo, size = 40, className = '' }) => {
  const radius = Math.round(size * 0.3);
  const style: React.CSSProperties = { width: size, height: size, borderRadius: radius, backgroundColor: color, flexShrink: 0 };

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`object-cover shadow-md ${className}`}
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  if (gender || ageGroup) {
    const skinColor = SKIN_TONES[skin == null ? DEFAULT_SKIN : clampSkin(skin)];
    return (
      <span className={`relative inline-block overflow-hidden shadow-md ${className}`} style={style} role="img" aria-label={name}>
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
          <circle cx="32" cy="32" r="30" fill="#FFFFFF" opacity="0.14" />
          <Character gender={gender ?? 'x'} age={ageGroup ?? 'adult'} skin={skinColor} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center text-white font-bold shadow-md select-none ${className}`}
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.38)), backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.22), rgba(0,0,0,.08))' }}
      role="img"
      aria-label={name}
    >
      {initialsOf(name)}
    </span>
  );
};
