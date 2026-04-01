const DEFAULT_CASEWORKER_LOGIN_EMAIL = 'jobcenter@sachbearbeiter.de';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCaseworkerCredentialsEnabled(): boolean {
  return (
    process.env.CASEWORKER_CREDENTIALS_ENABLED === '1' ||
    process.env.NEXT_PUBLIC_CASEWORKER_CREDENTIALS_ENABLED === '1'
  );
}

export function getCaseworkerLoginEmail(): string {
  const raw =
    process.env.CASEWORKER_LOGIN_EMAIL ||
    process.env.NEXT_PUBLIC_CASEWORKER_LOGIN_EMAIL ||
    DEFAULT_CASEWORKER_LOGIN_EMAIL;

  return normalizeEmail(raw);
}
