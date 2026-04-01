import type { NextConfig } from "next";

const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://www.stakeandscale.de";
const cspReportOnly = process.env.CSP_REPORT_ONLY === "true";
const appOriginHost = (() => {
  try {
    return new URL(appOrigin).host;
  } catch {
    return undefined;
  }
})();
const extraServerActionOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const serverActionAllowedOrigins = Array.from(
  new Set([
    "stakeandscale.de",
    "www.stakeandscale.de",
    ...(appOriginHost ? [appOriginHost] : []),
    ...extraServerActionOrigins,
  ])
);

const cspValue = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://analytics.tiktok.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https://hoirqrkdgbmvpwutwuwj.supabase.co https://upload.wikimedia.org https://simpleicons.org https://www.googletagmanager.com https://*.vercel-storage.com https://*.blob.vercel-storage.com https://www.transparenttextures.com https://grainy-gradients.vercel.app https://source.unsplash.com https://images.unsplash.com https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "media-src 'self' blob: data: https://hoirqrkdgbmvpwutwuwj.supabase.co https://*.vercel-storage.com https://*.blob.vercel-storage.com https://storage.googleapis.com https://cdn.soundstripe.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' data: blob: https://hoirqrkdgbmvpwutwuwj.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.vercel-storage.com https://*.blob.vercel-storage.com https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us",
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
  async headers() {
    const cspHeaderKey = cspReportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";

    return [
      // CORS headers for API routes (fixes Safari access control errors)
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'development' ? '*' : appOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-request-id' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: cspHeaderKey,
            value: cspValue,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
