import React, { createContext, useContext, useState } from 'react';

interface Region {
  currency: string;
  locale: string;
}

const regions: Record<string, Region> = {
  XAF: { currency: 'XAF', locale: 'fr-FR' },
  EUR: { currency: 'EUR', locale: 'fr-FR' },
  USD: { currency: 'USD', locale: 'en-US' },
};

interface RegionContextType {
  region: Region;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'XAF';
  });

  const region = regions[currency] || regions.XAF;

  const setCurrency = (curr: string) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr);
  };

  const formatCurrency = (amount: number, currencyOverride?: string) => {
    const code = currencyOverride || region.currency;
    const locale = (regions[code] || region).locale;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: code === 'XAF' ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString(locale)} ${code}`;
    }
  };

  return (
    <RegionContext.Provider value={{ region, setCurrency, formatCurrency }}>
      {children}
    </RegionContext.Provider>
  );
};

export function useRegion(): RegionContextType {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used within RegionProvider');
  return ctx;
}
