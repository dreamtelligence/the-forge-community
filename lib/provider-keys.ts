import Replicate from 'replicate';
import { prisma } from '@/lib/prisma';
import { encryptAndSerialize, deserializeAndDecrypt } from '@/lib/integrations/crypto';

export const REPLICATE_PROVIDER = 'replicate' as const;

export type ProviderKeySource = 'user' | 'platform' | 'none';

export type ReplicateKeyStatus = {
  provider: typeof REPLICATE_PROVIDER;
  source: ProviderKeySource;
  hasUserKey: boolean;
  keyHint: string | null;
  updatedAt: string | null;
  validationError: string | null;
};

export type ReplicateAuthResolution = {
  token: string;
  source: Exclude<ProviderKeySource, 'none'>;
  keyHint: string;
};

const MIN_REPLICATE_TOKEN_LENGTH = 20;

const getPlatformReplicateToken = () => {
  const value = (process.env.REPLICATE_API_TOKEN || '').trim();
  return value.length ? value : null;
};

const normalizeToken = (value: string) => value.trim();

const validateReplicateTokenLive = async (token: string) => {
  const response = await fetch('https://api.replicate.com/v1/account', {
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Replicate-Key konnte nicht verifiziert werden (HTTP ${response.status}).${
        errorText ? ` ${errorText.slice(0, 140)}` : ''
      }`
    );
  }

  return true;
};

export const formatKeyHint = (token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized.length) return '****';
  if (normalized.length <= 8) return `${normalized.slice(0, 2)}****`;
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
};

export const validateReplicateToken = (rawToken: string) => {
  const token = normalizeToken(rawToken);
  if (!token) {
    return { valid: false, error: 'Token darf nicht leer sein.' };
  }
  if (token.length < MIN_REPLICATE_TOKEN_LENGTH) {
    return { valid: false, error: 'Token ist zu kurz.' };
  }
  if (/\s/.test(token)) {
    return { valid: false, error: 'Token darf keine Leerzeichen enthalten.' };
  }
  if (!/^r8_[A-Za-z0-9_-]+$/.test(token)) {
    return { valid: false, error: 'Replicate Token-Format ist ungültig.' };
  }
  return { valid: true, token };
};

const getUserReplicateKeyRecord = async (userId: string) => {
  return prisma.userProviderKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: REPLICATE_PROVIDER,
      },
    },
    select: {
      encryptedKey: true,
      keyHint: true,
      isActive: true,
      updatedAt: true,
      validationError: true,
      lastValidatedAt: true,
    },
  });
};

export async function getReplicateKeyStatusForUser(userId: string): Promise<ReplicateKeyStatus> {
  const record = await getUserReplicateKeyRecord(userId);
  const hasUserKey = Boolean(record?.isActive && record.encryptedKey);
  const validationError = record?.validationError ?? null;
  const userKeyUsable = Boolean(hasUserKey && !validationError);

  const platformToken = getPlatformReplicateToken();

  if (userKeyUsable && record) {
    return {
      provider: REPLICATE_PROVIDER,
      source: 'user',
      hasUserKey: true,
      keyHint: record.keyHint,
      updatedAt: record.updatedAt.toISOString(),
      validationError: null,
    };
  }

  if (platformToken) {
    return {
      provider: REPLICATE_PROVIDER,
      source: 'platform',
      hasUserKey,
      keyHint: hasUserKey && record ? record.keyHint : formatKeyHint(platformToken),
      updatedAt: hasUserKey && record ? record.updatedAt.toISOString() : null,
      validationError,
    };
  }

  return {
    provider: REPLICATE_PROVIDER,
    source: 'none',
    hasUserKey,
    keyHint: hasUserKey && record ? record.keyHint : null,
    updatedAt: hasUserKey && record ? record.updatedAt.toISOString() : null,
    validationError,
  };
}

export async function upsertReplicateKeyForUser(userId: string, rawToken: string) {
  const validation = validateReplicateToken(rawToken);
  if (!validation.valid || !validation.token) {
    throw new Error(validation.error);
  }

  const token = validation.token;
  await validateReplicateTokenLive(token);

  const encryptedKey = encryptAndSerialize(token);
  const keyHint = formatKeyHint(token);

  await prisma.userProviderKey.upsert({
    where: {
      userId_provider: {
        userId,
        provider: REPLICATE_PROVIDER,
      },
    },
    update: {
      encryptedKey,
      keyHint,
      isActive: true,
      validationError: null,
      lastValidatedAt: new Date(),
    },
    create: {
      userId,
      provider: REPLICATE_PROVIDER,
      encryptedKey,
      keyHint,
      isActive: true,
      lastValidatedAt: new Date(),
      validationError: null,
    },
  });

  return getReplicateKeyStatusForUser(userId);
}

export async function removeReplicateKeyForUser(userId: string) {
  await prisma.userProviderKey.deleteMany({
    where: {
      userId,
      provider: REPLICATE_PROVIDER,
    },
  });

  return getReplicateKeyStatusForUser(userId);
}

export async function resolveReplicateAuthForUser(userId: string): Promise<ReplicateAuthResolution | null> {
  const record = await getUserReplicateKeyRecord(userId);

  if (record?.isActive && record.encryptedKey && !record.validationError) {
    try {
      const token = deserializeAndDecrypt(record.encryptedKey).trim();
      if (token.length) {
        return {
          token,
          source: 'user',
          keyHint: record.keyHint,
        };
      }
    } catch {
      console.error('[ProviderKeys] Failed to decrypt user Replicate key');
      await prisma.userProviderKey.updateMany({
        where: {
          userId,
          provider: REPLICATE_PROVIDER,
        },
        data: {
          validationError: 'Key konnte nicht entschlüsselt werden. Bitte erneut speichern.',
          lastValidatedAt: new Date(),
        },
      });
    }
  }

  const platformToken = getPlatformReplicateToken();
  if (!platformToken) {
    return null;
  }

  return {
    token: platformToken,
    source: 'platform',
    keyHint: formatKeyHint(platformToken),
  };
}

export async function getReplicateClientForUser(userId: string) {
  const resolved = await resolveReplicateAuthForUser(userId);
  if (!resolved) return null;

  return {
    ...resolved,
    client: new Replicate({ auth: resolved.token }),
  };
}
