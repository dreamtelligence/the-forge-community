/**
 * API Key Statistics
 *
 * GET /api/keys/[id]/stats - Get usage statistics
 *
 * Provides detailed analytics for API key usage:
 * - Total requests & credits used
 * - Requests by endpoint
 * - Requests by day (last 30 days)
 * - Average response time
 * - Error rate
 *
 * Authentication: NextAuth session required
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiKeyStats } from '@/lib/api-keys/types';

/**
 * GET /api/keys/[id]/stats - Get key usage statistics
 *
 * Query params:
 * - days (optional): Number of days to analyze (default: 30, max: 365)
 *
 * Response (200):
 * {
 *   "totalRequests": 1234,
 *   "totalCredits": 567,
 *   "requestsByEndpoint": {
 *     "/api/v1/media/generate": 100,
 *     "/api/v1/content/create": 50
 *   },
 *   "requestsByDay": {
 *     "2026-02-01": 45,
 *     "2026-02-02": 67
 *   },
 *   "avgResponseTime": 234,
 *   "errorRate": 0.02,
 *   "lastUsedAt": "2026-02-01T..."
 * }
 */
export async function GET(
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

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const days = Math.min(
      parseInt(searchParams.get('days') || '30', 10),
      365
    );

    // 3. Verify key ownership
    const key = await prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        lastUsedAt: true,
      },
    });

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // 4. Calculate time window
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 5. Fetch request logs
    const requests = await prisma.apiRequest.findMany({
      where: {
        apiKeyId: id,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        endpoint: true,
        statusCode: true,
        creditsUsed: true,
        responseTime: true,
        createdAt: true,
        error: true,
      },
    });

    // 6. Calculate statistics
    const totalRequests = requests.length;
    const totalCredits = requests.reduce(
      (sum, req) => sum + (req.creditsUsed || 0),
      0
    );

    // Requests by endpoint
    const requestsByEndpoint: Record<string, number> = {};
    for (const req of requests) {
      requestsByEndpoint[req.endpoint] =
        (requestsByEndpoint[req.endpoint] || 0) + 1;
    }

    // Requests by day
    const requestsByDay: Record<string, number> = {};
    for (const req of requests) {
      const day = req.createdAt.toISOString().split('T')[0];
      requestsByDay[day] = (requestsByDay[day] || 0) + 1;
    }

    // Average response time
    const totalResponseTime = requests.reduce(
      (sum, req) => sum + (req.responseTime || 0),
      0
    );
    const avgResponseTime =
      totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;

    // Error rate
    const errorCount = requests.filter(
      (req) => req.statusCode >= 400 || req.error
    ).length;
    const errorRate =
      totalRequests > 0 ? parseFloat((errorCount / totalRequests).toFixed(4)) : 0;

    // 7. Build response
    const stats: ApiKeyStats = {
      totalRequests,
      totalCredits,
      requestsByEndpoint,
      requestsByDay,
      avgResponseTime,
      errorRate,
      lastUsedAt: key.lastUsedAt?.toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API Keys] Error fetching stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch API key statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
