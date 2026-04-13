const DEFAULT_BETA_APPLICATION_EMAIL = 'info@stakeandscale.de';

export function isPublicLoginEnabled(): boolean {
  return true;
}

export function isPublicLoginDisabled(): boolean {
  return !isPublicLoginEnabled();
}

export function getBetaApplicationEmail(): string {
  return process.env.NEXT_PUBLIC_BETA_APPLICATION_EMAIL || DEFAULT_BETA_APPLICATION_EMAIL;
}

export function getClosedBetaLoginMessage(locale: 'de' | 'en' = 'de'): string {
  if (locale === 'en') {
    return 'Log in with your email to continue.';
  }
  return 'Logge dich mit deiner E-Mail ein, um fortzufahren.';
}

export function getClosedBetaLoginShortLabel(locale: 'de' | 'en' = 'de'): string {
  return locale === 'en' ? 'Log in' : 'Login';
}
