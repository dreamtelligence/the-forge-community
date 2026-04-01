import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const allowedPaths = ['/forum', '/login', '/legal'];
const LOCALE_COOKIE = 'forge_locale';

const { auth } = NextAuth(authConfig);

/**
 * CORS Configuration
 *
 * NOTE: IP Rate Limiting is handled in API routes (not middleware)
 * because it requires Prisma (Node.js runtime only).
 * See: lib/security/ip-rate-limit.ts
 */
const CORS_ENABLED = process.env.ENABLE_CORS_PROTECTION !== 'false';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `${APP_URL},https://stakeandscale.de,http://localhost:3000,http://127.0.0.1:3000`)
  .split(',')
  .map((origin) => origin.trim());

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase().replace(/\.$/, '');
  return lower.startsWith('www.') ? lower.slice(4) : lower;
}

function isSameSiteOrigin(request: NextRequest, origin: string): boolean {
  try {
    const originUrl = new URL(origin);
    const requestHost = normalizeHostname(request.nextUrl.hostname);
    const originHost = normalizeHostname(originUrl.hostname);
    return requestHost === originHost;
  } catch {
    return false;
  }
}

/**
 * Check CORS and set headers
 */
function handleCORS(request: NextRequest): NextResponse | null {
  if (!CORS_ENABLED) return null;

  const origin = request.headers.get('origin');
  const requestMethod = request.method;

  // OPTIONS preflight request
  if (requestMethod === 'OPTIONS') {
    if (origin && (ALLOWED_ORIGINS.includes(origin) || isSameSiteOrigin(request, origin))) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '3600'
        }
      });
    }

    // Disallowed origin - block preflight
    return new NextResponse(null, { status: 403 });
  }

  // Regular request - validate origin if present
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !isSameSiteOrigin(request, origin)) {
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  return null; // Continue processing
}

const isLocalizedRoute = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/pricing') ||
  pathname.startsWith('/login') ||
  pathname.startsWith('/legal');

export default auth(async (req: NextRequest) => {
  // Step 1: CORS handling (handles OPTIONS preflight)
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  // Step 2: Locale routing for public pages
  const pathname = req.nextUrl.pathname;
  const isEnPath = pathname === '/en' || pathname.startsWith('/en/');

  if (isEnPath) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, 'en', { path: '/' });
    return response;
  }

  if (isLocalizedRoute(pathname)) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, 'de', { path: '/' });
    return response;
  }

  // Step 2: Onboarding redirect logic
  const session = (req as any).auth;
  if (!session?.user) {
    return NextResponse.next();
  }

  const normalizedPath = pathname.startsWith('/en') ? pathname.slice(3) || '/' : pathname;
  const isAllowed = allowedPaths.some((path) => normalizedPath.startsWith(path));
  const onboardingComplete = session.user.onboardingComplete === true;

  if (onboardingComplete || isAllowed) {
    return NextResponse.next();
  }

  const redirectUrl = new URL('/forum', req.nextUrl);
  redirectUrl.searchParams.set('onboarding', 'required');
  return NextResponse.redirect(redirectUrl);
});

export const config = {
  matcher: [
    '/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)).*)',
  ],
};
