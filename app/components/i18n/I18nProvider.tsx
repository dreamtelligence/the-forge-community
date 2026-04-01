'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Locale } from '@/lib/i18n';

type Copy = Record<string, any>;

type I18nContextValue = {
  locale: Locale;
  copy: Copy;
  t: (key: string) => string;
  link: (path: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getByPath = (obj: Copy, path: string) =>
  path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), obj);

export function I18nProvider({
  locale,
  copy,
  children,
}: {
  locale: Locale;
  copy: Copy;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => {
      const found = getByPath(copy, key);
      return typeof found === 'string' ? found : key;
    };

    const link = (path: string) => {
      if (!path || path.startsWith('http') || path.startsWith('#')) return path;
      if (locale === 'en') {
        return path.startsWith('/en') ? path : `/en${path}`;
      }
      return path.replace(/^\/en(?=\/|$)/, '');
    };

    return { locale, copy, t, link };
  }, [locale, copy]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
