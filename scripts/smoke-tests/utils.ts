export function normalizeSessionCookie(rawValue: string, apiBaseUrl: string): string {
  const value = rawValue.trim();
  if (!value) return '';
  if (value.includes('=')) return value;

  const isHttps = /^https:\/\//i.test(apiBaseUrl);
  const cookieName = isHttps ? '__Secure-authjs.session-token' : 'authjs.session-token';
  return `${cookieName}=${value}`;
}

export function buildFormData(
  fields: Record<string, string | number | boolean | null | undefined>
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    formData.set(key, String(value));
  }
  return formData;
}

export async function fetchBlobForForm(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Asset fetch failed (${res.status})`);
  }
  const blob = await res.blob();
  let filename = fallbackName;
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split('/').filter(Boolean).pop();
    if (base) filename = base;
  } catch {
    // ignore malformed URLs; fallbackName is fine
  }
  return { blob, filename };
}

export function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
