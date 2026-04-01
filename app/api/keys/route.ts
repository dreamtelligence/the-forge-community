/**
 * API Key Management - CRUD Operations
 *
 * POST /api/keys - Create new API key
 * GET /api/keys - List user's API keys
 *
 * Authentication: NextAuth session required
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/api-keys/crypto';
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyListItem,
} from '@/lib/api-keys/types';
import { z } from 'zod';

/**
 * Validation schema for API key creation
 */
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  ventureId: z.string().optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope required'),
  rateLimit: z.number().int().min(10).max(10000).optional(),
  rateLimitDaily: z.number().int().min(100).max(100000).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * POST /api/keys - Create new API key
 *
 * Request Body:
 * {
 *   "name": "Production Bot",
 *   "ventureId": "optional_venture_id",
 *   "scopes": ["media:generate:image", "content:generate:marketing"],
 *   "rateLimit": 100,  // optional, default 100
 *   "rateLimitDaily": 1000,  // optional, default 1000
 *   "expiresAt": "2026-12-31T23:59:59Z"  // optional
 * }
 *
 * Response (201):
 * {
 *   "apiKey": "forge_prod_xxxxxxx",  // SHOW ONCE - never again!
 *   "keyId": "key_id",
 *   "keyPrefix": "forge_prod",
 *   "name": "Production Bot",
 *   "scopes": [...],
 *   "createdAt": "2026-02-01T..."
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse and validate request
    const body = await req.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data: CreateApiKeyRequest = validation.data as CreateApiKeyRequest;

    // 3. If ventureId provided, verify user owns it
    if (data.ventureId) {
      const venture = await prisma.venture.findFirst({
        where: {
          id: data.ventureId,
          OR: [
            { ownerId: userId },
            {
              squad: {
                members: {
                  some: {
                    userId,
                    leftAt: null,
                  },
                },
              },
            },
          ],
        },
      });

      if (!venture) {
        return NextResponse.json(
          { error: 'Venture not found or access denied' },
          { status: 404 }
        );
      }
    }

    // 4. Check user doesn't have too many keys (limit: 50)
    const keyCount = await prisma.apiKey.count({
      where: { userId },
    });

    if (keyCount >= 50) {
      return NextResponse.json(
        { error: 'Maximum API keys limit reached (50)' },
        { status: 429 }
      );
    }

    // 5. Generate cryptographically secure API key
    const { apiKey, keyHash, keyPrefix } = generateApiKey();

    // 6. Create in database
    const dbKey = await prisma.apiKey.create({
      data: {
        userId,
        ventureId: data.ventureId,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        rateLimit: data.rateLimit ?? 100,
        rateLimitDaily: data.rateLimitDaily ?? 1000,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    // 7. Return response (including plaintext key - SHOW ONCE!)
    const response: CreateApiKeyResponse = {
      apiKey, // ⚠️ PLAINTEXT KEY - Show once, never stored
      keyId: dbKey.id,
      keyPrefix: dbKey.keyPrefix,
      name: dbKey.name,
      scopes: dbKey.scopes,
      createdAt: dbKey.createdAt.toISOString(),
      expiresAt: dbKey.expiresAt?.toISOString(),
    };

    console.log(`[API Keys] Created key "${data.name}" for user ${userId}`);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API Keys] Error creating key:', error);

    return NextResponse.json(
      {
        error: 'Failed to create API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/keys - List user's API keys
 *
 * Query params:
 * - ventureId (optional): Filter by venture
 * - includeInactive (optional): Include inactive keys
 *
 * Response (200):
 * {
 *   "keys": [
 *     {
 *       "id": "key_id",
 *       "name": "Production Bot",
 *       "keyPrefix": "forge_prod",
 *       "scopes": [...],
 *       "ventureId": "...",
 *       "ventureName": "...",
 *       "rateLimit": 100,
 *       "rateLimitDaily": 1000,
 *       "isActive": true,
 *       "lastUsedAt": "2026-02-01T...",
 *       "expiresAt": "2026-12-31T...",
 *       "createdAt": "2026-02-01T..."
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const ventureId = searchParams.get('ventureId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // 3. Build query
    const where: any = { userId };

    if (ventureId) {
      where.ventureId = ventureId;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    // 4. Fetch keys
    const keys = await prisma.apiKey.findMany({
      where,
      include: {
        venture: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Format response (no plaintext keys!)
    const response: ApiKeyListItem[] = keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      ventureId: key.ventureId || undefined,
      ventureName: key.venture?.name,
      rateLimit: key.rateLimit,
      rateLimitDaily: key.rateLimitDaily,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt?.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      createdAt: key.createdAt.toISOString(),
    }));

    return NextResponse.json({ keys: response });
  } catch (error) {
    console.error('[API Keys] Error listing keys:', error);

    return NextResponse.json(
      {
        error: 'Failed to list API keys',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
