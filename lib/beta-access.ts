const DEFAULT_BETA_APPLICATION_EMAIL = 'info@stakeandscale.de';

export function isPublicLoginEnabled(): boolean {
  return (
    process.env.PUBLIC_LOGIN_ENABLED === '1' ||
    process.env.NEXT_PUBLIC_PUBLIC_LOGIN_ENABLED === '1'
  );
}

export function isPublicLoginDisabled(): boolean {
  return !isPublicLoginEnabled();
}

export function getBetaApplicationEmail(): string {
  return process.env.NEXT_PUBLIC_BETA_APPLICATION_EMAIL || DEFAULT_BETA_APPLICATION_EMAIL;
}

export function getClosedBetaLoginMessage(locale: 'de' | 'en' = 'de'): string {
  const email = getBetaApplicationEmail();
  if (locale === 'en') {
    return `Closed beta: login is currently disabled. Apply via email at ${email}.`;
  }
  return `Geschlossene Beta: Login ist aktuell deaktiviert. Bewirb dich per E-Mail an ${email}.`;
}

export function getClosedBetaLoginShortLabel(locale: 'de' | 'en' = 'de'): string {
  return locale === 'en' ? 'Closed Beta' : 'Beta geschlossen';
}
