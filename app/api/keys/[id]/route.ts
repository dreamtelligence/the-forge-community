/**
 * API Key Management - Single Key Operations
 *
 * GET /api/keys/[id] - Get key details
 * PATCH /api/keys/[id] - Update key
 * DELETE /api/keys/[id] - Revoke/delete key
 *
 * Authentication: NextAuth session required
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiKeyListItem } from '@/lib/api-keys/types';
import { z } from 'zod';

/**
 * Validation schema for API key updates
 */
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  rateLimit: z.number().int().min(10).max(10000).optional(),
  rateLimitDaily: z.number().int().min(100).max(100000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/keys/[id] - Get key details
 *
 * Response (200):
 * {
 *   "id": "key_id",
 *   "name": "Production Bot",
 *   "keyPrefix": "forge_prod",
 *   "scopes": [...],
 *   ...
 * }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Fetch key (verify ownership)
    const key = await prisma.apiKey.findFirst({
      where: {
        id,
        userId, // User must own the key
      },
      include: {
        venture: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // 3. Format response
    const response: ApiKeyListItem = {
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Keys] Error fetching key:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/keys/[id] - Update key
 *
 * Request Body:
 * {
 *   "name": "New Name",  // optional
 *   "scopes": [...],     // optional
 *   "rateLimit": 200,    // optional
 *   "rateLimitDaily": 2000,  // optional
 *   "isActive": false    // optional
 * }
 *
 * Response (200):
 * {
 *   "id": "key_id",
 *   "name": "New Name",
 *   ...
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const validation = updateApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 3. Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // 4. Update key
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.scopes && { scopes: data.scopes }),
        ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
        ...(data.rateLimitDaily !== undefined && {
          rateLimitDaily: data.rateLimitDaily,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        venture: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 5. Format response
    const response: ApiKeyListItem = {
      id: updatedKey.id,
      name: updatedKey.name,
      keyPrefix: updatedKey.keyPrefix,
      scopes: updatedKey.scopes,
      ventureId: updatedKey.ventureId || undefined,
      ventureName: updatedKey.venture?.name,
      rateLimit: updatedKey.rateLimit,
      rateLimitDaily: updatedKey.rateLimitDaily,
      isActive: updatedKey.isActive,
      lastUsedAt: updatedKey.lastUsedAt?.toISOString(),
      expiresAt: updatedKey.expiresAt?.toISOString(),
      createdAt: updatedKey.createdAt.toISOString(),
    };

    console.log(`[API Keys] Updated key ${id} for user ${userId}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Keys] Error updating key:', error);

    return NextResponse.json(
      {
        error: 'Failed to update API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keys/[id] - Revoke/delete key
 *
 * Permanently deletes the API key and all associated request logs.
 *
 * Response (204): No content
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // 3. Delete key (cascades to ApiRequest via ON DELETE CASCADE)
    await prisma.apiKey.delete({
      where: { id },
    });

    console.log(`[API Keys] Deleted key ${id} for user ${userId}`);

    // 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API Keys] Error deleting key:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
