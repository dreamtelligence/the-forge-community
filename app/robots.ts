import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.stakeandscale.de';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/settings',
          '/messages',
          '/forum',
          '/pricing',
          '/resources',
          '/demo-shop',
          '/forge/',
          '/ventures/',
          '/squads/',
          '/admin/',
          '/profile/',
          '/login',
          '/calendar',
          '/tasks',
          '/transparency',
          '/updates',
          '/communication',
          '/media',
          '/docs/',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/og-image.jpg',
          '/android-chrome-512x512.png',
          '/apple-touch-icon.png',
          '/Ai_videos/',
          '/Veo/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
