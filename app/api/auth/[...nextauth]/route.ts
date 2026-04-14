import { handlers } from '@/auth';
import { RateLimiters } from '@/lib/security/rate-limit';
import { NextRequest } from 'next/server';

const { GET: authGet, POST: authPost } = handlers;

export const GET = authGet;

export async function POST(request: NextRequest) {
  const pathname = new URL(request.url).pathname.toLowerCase();
  const shouldLimitAuthPost =
    pathname.includes('/signin') ||
    pathname.includes('/callback/credentials') ||
    pathname.includes('/callback/email');

  if (shouldLimitAuthPost) {
    const rateLimited = await RateLimiters.auth(request);
    if (rateLimited) return rateLimited;
  }

  return authPost(request);
}
