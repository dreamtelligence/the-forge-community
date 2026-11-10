import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Stake & Scale is archived. Only the design showcase and legal pages are public.
// This gate applies before Next.js route handlers, including authentication,
// billing, webhooks and scheduled task endpoints.
const publicPages = new Set([
  '/',
  '/en',
  '/legal/impressum',
  '/legal/datenschutz',
  '/legal/agb',
  '/en/legal/impressum',
  '/en/legal/datenschutz',
  '/en/legal/agb',
]);

const publicMetadata = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml', '/site.webmanifest']);
const staticAsset = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|mp4|webm|woff2?|ttf|otf|eot|mp3|wav)$/i;

function discontinued() {
  return new NextResponse('This application has been discontinued. Only the design showcase remains available.', {
    status: 410,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // No mutations, Auth.js callbacks, Next.js Server Actions or API requests.
  if (request.method !== 'GET' && request.method !== 'HEAD') return discontinued();
  if (request.headers.has('next-action')) return discontinued();
  if (pathname === '/api' || pathname.startsWith('/api/')) return discontinued();

  if (publicPages.has(pathname)) {
    const response = NextResponse.next();
    response.cookies.set('forge_locale', pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'de', {
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  if (
    publicMetadata.has(pathname) ||
    pathname.startsWith('/_next/static/') ||
    pathname === '/_next/image' ||
    pathname.startsWith('/_next/image/') ||
    staticAsset.test(pathname)
  ) {
    return NextResponse.next();
  }

  return discontinued();
}

export const config = {
  matcher: '/:path*',
};
