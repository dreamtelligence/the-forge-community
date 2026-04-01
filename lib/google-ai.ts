const GOOGLE_AI_STUDIO_KEY_ENV_KEYS = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_AI_STUDIO_API_KEY',
] as const;

type GoogleAIStudioKeyEnvName = (typeof GOOGLE_AI_STUDIO_KEY_ENV_KEYS)[number];

export const GOOGLE_AI_STUDIO_KEY_ENV_HINT = GOOGLE_AI_STUDIO_KEY_ENV_KEYS.join(' / ');

export function resolveGoogleAIStudioApiKey():
  | { key: string; source: GoogleAIStudioKeyEnvName }
  | null {
  for (const envName of GOOGLE_AI_STUDIO_KEY_ENV_KEYS) {
    const value = process.env[envName]?.trim();
    if (value) {
      return { key: value, source: envName };
    }
  }
  return null;
}

export function getGoogleAIStudioApiKeyOrThrow() {
  const resolved = resolveGoogleAIStudioApiKey();
  if (!resolved) {
    throw new Error(`Google AI Studio API Key fehlt (${GOOGLE_AI_STUDIO_KEY_ENV_HINT}).`);
  }
  return resolved;
}

