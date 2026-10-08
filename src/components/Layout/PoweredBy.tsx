import React from 'react';

/** Signature discrète du concepteur, en bas des écrans. */
export const PoweredBy: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p className={`print:hidden text-center text-[11px] tracking-wide text-gray-400 dark:text-gray-500 ${className}`}>
    Powered by{' '}
    <a
      href="https://www.joyeds.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
    >
      JoYed&apos;S
    </a>
  </p>
);
