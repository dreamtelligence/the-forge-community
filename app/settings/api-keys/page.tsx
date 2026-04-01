/**
 * API Key Management Page
 *
 * User-facing interface for managing API keys:
 * - Create new keys with scope selection
 * - View existing keys
 * - Revoke keys
 * - View usage statistics
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isForumVenture } from '@/lib/forum-venture';
import { isPersonalStudioVenture } from '@/lib/personal-studio';
import ApiKeysClient from './ApiKeysClient';
import type { ApiKeyListItem } from '@/lib/api-keys/types';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'API Keys - Settings | The Forge',
  description: 'Manage your API keys for external integrations',
};

/**
 * Fetch user's API keys
 */
async function getUserApiKeys(userId: string): Promise<ApiKeyListItem[]> {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
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

  return keys.map((key) => ({
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
}

/**
 * Fetch user's ventures for venture selector
 */
async function getUserVentures(userId: string) {
  const ventures = await prisma.venture.findMany({
    where: {
      isPersonalStudio: false,
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
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return ventures
    .filter((venture) => !isForumVenture(venture) && !isPersonalStudioVenture(venture))
    .map(({ id, name }) => ({ id, name }));
}

export default async function ApiKeysPage() {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // 2. Fetch data
  const [apiKeys, ventures] = await Promise.all([
    getUserApiKeys(userId),
    getUserVentures(userId),
  ]);

  // 3. Render client component
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-zinc-400">
            Manage API keys for external integrations with Zapier, Make, n8n, and custom applications.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Total Keys</div>
            <div className="text-2xl font-bold text-white">{apiKeys.length}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {50 - apiKeys.length} remaining
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Active Keys</div>
            <div className="text-2xl font-bold text-green-500">
              {apiKeys.filter((k) => k.isActive).length}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {apiKeys.filter((k) => !k.isActive).length} inactive
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Last Used</div>
            <div className="text-2xl font-bold text-white">
              {apiKeys.some((k) => k.lastUsedAt) ? (
                <span className="text-base">
                  {new Date(
                    Math.max(
                      ...apiKeys
                        .filter((k) => k.lastUsedAt)
                        .map((k) => new Date(k.lastUsedAt!).getTime())
                    )
                  ).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              ) : (
                <span className="text-zinc-500 text-base">Never</span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Across all keys</div>
          </div>
        </div>

        {/* Client Component */}
        <ApiKeysClient initialKeys={apiKeys} ventures={ventures} />

        {/* Documentation Link */}
        <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            API Documentation
          </h3>
          <p className="text-zinc-400 text-sm mb-4">
            Learn how to use your API keys with our comprehensive documentation and code examples.
          </p>
          <a
            href="/docs/api"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
          >
            View API Docs
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
