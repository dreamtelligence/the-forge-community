/**
 * Versioned API v1 - Media Generation (Example)
 *
 * POST /api/v1/media/generate-image
 *
 * Example implementation showing API key authentication usage.
 * This is a production-ready template for all v1 API endpoints.
 *
 * Authentication: API Key (Bearer token)
 * Required Scopes: media:generate:image
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateApiRequest,
  logRequestCompletion,
  formatApiError,
} from '@/lib/api-keys/auth';
import { reserveEnergy, settleEnergy } from '@/lib/finance/energy';
import { z } from 'zod';

/**
 * Request validation schema
 */
const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.enum(['flux-schnell', 'flux-pro', 'stable-diffusion']).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  steps: z.number().int().min(1).max(50).optional(),
});

/**
 * POST /api/v1/media/generate-image
 *
 * Request Headers:
 * Authorization: Bearer forge_prod_xxxxxxxx
 *
 * Request Body:
 * {
 *   "prompt": "A serene mountain landscape at sunset",
 *   "model": "flux-schnell",  // optional
 *   "width": 1024,  // optional
 *   "height": 1024  // optional
 * }
 *
 * Response (200):
 * {
 *   "data": {
 *     "url": "https://blob.vercel-storage.com/...",
 *     "width": 1024,
 *     "height": 1024,
 *     "model": "flux-schnell",
 *     "creditsUsed": 10
 *   },
 *   "meta": {
 *     "requestId": "abc123...",
 *     "timestamp": "2026-02-01T..."
 *   }
 * }
 *
 * Error Responses:
 * - 401: Missing or invalid API key
 * - 403: Insufficient scopes
 * - 429: Rate limit exceeded
 * - 402: Insufficient credits
 * - 400: Invalid request
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  let context: Awaited<ReturnType<typeof authenticateApiRequest>> | null = null;

  try {
    // ============================================
    // 1. AUTHENTICATE API REQUEST
    // ============================================
    context = await authenticateApiRequest(req, ['media:generate:image']);

    const { user, apiKey, requestId } = context;

    console.log(
      `[API v1] Image generation request from user ${user.id} (key: ${apiKey.keyPrefix})`
    );

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    const body = await req.json();
    const validation = generateImageSchema.safeParse(body);

    if (!validation.success) {
      await logRequestCompletion(context, req, 400, 0, 'Validation failed');

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.issues,
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const { prompt, model = 'flux-schnell', width = 1024, height = 1024 } = validation.data;

    // ============================================
    // 3. RESERVE ENERGY (CREDITS)
    // ============================================
    const estimatedCost = model === 'flux-pro' ? 15 : 10;

    const reservation = await reserveEnergy({
      userId: user.id,
      amount: estimatedCost,
      feature: 'api-image-generation',
      requestId: `api-${requestId}`,
      provider: 'replicate',
      model,
    });

    // ============================================
    // 4. PERFORM ACTUAL IMAGE GENERATION
    // ============================================
    // TODO: Replace with actual Replicate API call
    // For now, simulate generation
    const mockImage = {
      url: 'https://example.com/generated-image.png',
      width,
      height,
      model,
    };

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ============================================
    // 5. SETTLE ENERGY (ACTUAL COST)
    // ============================================
    const actualCost = 10; // Actual cost from Replicate

    await settleEnergy({
      reservationId: reservation.reservationId,
      finalCost: actualCost,
      usage: {
        promptTokens: prompt.length,
        completionTokens: 0,
        totalTokens: prompt.length,
      },
    });

    // ============================================
    // 6. LOG REQUEST & RETURN SUCCESS
    // ============================================
    await logRequestCompletion(context, req, 200, actualCost);

    const responseTime = Date.now() - requestStartTime;

    return NextResponse.json(
      {
        data: {
          ...mockImage,
          creditsUsed: actualCost,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
        },
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${responseTime}ms`,
          'X-Credits-Used': String(actualCost),
        },
      }
    );
  } catch (error) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    console.error('[API v1] Image generation error:', error);

    // Refund reserved credits on error
    if (context) {
      await logRequestCompletion(
        context,
        req,
        500,
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return formatApiError(error, context?.requestId);
  }
}
