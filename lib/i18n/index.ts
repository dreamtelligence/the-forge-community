export type Locale = 'de' | 'en';

export const locales: Locale[] = ['de', 'en'];
export const defaultLocale: Locale = 'de';

const loaders: Record<Locale, () => Promise<{ default: Record<string, any> }>> = {
  de: () => import('./copy/de'),
  en: () => import('./copy/en'),
};

export async function getCopy(locale: Locale) {
  const loader = loaders[locale] ?? loaders[defaultLocale];
  const mod = await loader();
  return mod.default;
}
