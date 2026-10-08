import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar } from '../Brand/Avatar';
import { AGE_GROUPS, AVATAR_COLORS, GENDERS, SKIN_TONES, resizePhoto } from '../../lib/avatar';
import type { AgeGroup, Gender } from '../../lib/avatar';
import { useLanguage } from '../../i18n';

const GENDER_LABEL: Record<Gender, string> = { f: 'profile.genderF', m: 'profile.genderM', x: 'profile.genderX' };
const AGE_LABEL: Record<AgeGroup, string> = { child: 'profile.ageChild', teen: 'profile.ageTeen', adult: 'profile.ageAdult', senior: 'profile.ageSenior' };
const AGE_HINT: Record<AgeGroup, string> = { child: 'profile.ageChildHint', teen: 'profile.ageTeenHint', adult: 'profile.ageAdultHint', senior: 'profile.ageSeniorHint' };

export interface AvatarValue {
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  skin: number;
  color: string;
}

interface AvatarPickerProps {
  name: string;
  value: AvatarValue;
  onChange: (next: AvatarValue) => void;
  /** Photo actuelle (profil personnel uniquement). */
  photo?: string | null;
  /** Active le choix d'une photo ; reçoit la photo réduite, ou null pour la retirer. */
  onPhotoChange?: (photo: string | null) => void;
}

const pill = (active: boolean) =>
  `px-3 py-2 text-sm font-medium rounded-xl border transition-all ${
    active
      ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
  }`;

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ name, value, onChange, photo, onPhotoChange }) => {
  const { t } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !onPhotoChange) return;
    setBusy(true);
    setPhotoError(false);
    try {
      onPhotoChange(await resizePhoto(file));
    } catch {
      setPhotoError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={name} color={value.color} gender={value.gender} ageGroup={value.ageGroup} skin={value.skin} photo={photo} size={96} />
        {onPhotoChange && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {t('profile.choosePhoto')}
            </button>
            {photo && (
              <button type="button" onClick={() => onPhotoChange(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-3.5 h-3.5" /> {t('profile.removePhoto')}
              </button>
            )}
            <input ref={fileInput} data-testid="photo-input" type="file" accept="image/*" className="hidden" onChange={e => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        )}
        {photoError && <p className="text-xs text-red-500">{t('profile.photoError')}</p>}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('profile.gender')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('profile.gender')}>
          {GENDERS.map(g => (
            <button key={g} type="button" aria-pressed={value.gender === g} onClick={() => onChange({ ...value, gender: g })} className={pill(value.gender === g)}>
              {t(GENDER_LABEL[g])}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('profile.ageGroup')}</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('profile.ageGroup')}>
          {AGE_GROUPS.map(a => (
            <button key={a} type="button" aria-pressed={value.ageGroup === a} onClick={() => onChange({ ...value, ageGroup: a })} className={`${pill(value.ageGroup === a)} text-left`}>
              <span className="block">{t(AGE_LABEL[a])}</span>
              <span className={`block text-[11px] font-normal ${value.ageGroup === a ? 'text-white/80' : 'text-gray-400'}`}>{t(AGE_HINT[a])}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('profile.skin')}</p>
          <div className="flex gap-2" role="group" aria-label={t('profile.skin')}>
            {SKIN_TONES.map((c, i) => (
              <button key={c} type="button" aria-label={`${t('profile.skin')} ${i + 1}`} aria-pressed={value.skin === i} onClick={() => onChange({ ...value, skin: i })}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${value.skin === i ? 'border-blue-500 scale-110 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-white dark:border-gray-700 hover:scale-105'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('profile.color')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('profile.color')}>
            {AVATAR_COLORS.map((c, i) => (
              <button key={c} type="button" aria-label={`${t('profile.color')} ${i + 1}`} aria-pressed={value.color === c} onClick={() => onChange({ ...value, color: c })}
                className={`w-7 h-7 rounded-lg transition-transform ${value.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
