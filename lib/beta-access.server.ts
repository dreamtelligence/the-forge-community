import 'server-only';

import { isPublicLoginEnabled } from '@/lib/beta-access';
import { isConfiguredAdminEmail } from '@/lib/security/admin-access';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getInternalAllowlist(): Set<string> {
  const entries: string[] = [];

  if (process.env.BETA_LOGIN_ALLOWLIST) {
    entries.push(
      ...process.env.BETA_LOGIN_ALLOWLIST.split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    );
  }

  return new Set(entries.map(normalizeEmail));
}

export function isLoginAllowedDuringClosedBeta(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  if (isConfiguredAdminEmail(email)) {
    return true;
  }

  if (isPublicLoginEnabled()) {
    return true;
  }

  const normalized = normalizeEmail(email);
  return getInternalAllowlist().has(normalized);
}
