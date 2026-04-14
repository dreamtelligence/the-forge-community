import type { Role } from '@prisma/client';
import { getCaseworkerLoginEmail, isCaseworkerCredentialsEnabled } from '@/lib/caseworker-login';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): Set<string> {
  const emails = [
    ...parseCsvEnv(process.env.ADMIN_EMAILS),
    ...parseCsvEnv(process.env.ADMIN_EMAIL),
  ];

  if (isCaseworkerCredentialsEnabled()) {
    emails.push(getCaseworkerLoginEmail());
  }

  return new Set(emails.map(normalizeEmail));
}

export function isConfiguredAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return getConfiguredAdminEmails().has(normalizeEmail(email));
}

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === 'ADMIN';
}
