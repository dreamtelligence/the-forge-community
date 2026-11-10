import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

const showcaseUrl = 'https://the-forge-community.vercel.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090A',
};

export const metadata: Metadata = {
  metadataBase: new URL(showcaseUrl),
  title: 'STAKE & SCALE — Design Showcase',
  description: 'Archivierte Landingpage und Interface-Designstudie von Stake & Scale. Das ursprüngliche Produkt ist nicht mehr aktiv.',
  alternates: { canonical: showcaseUrl },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('forge_locale')?.value === 'en' ? 'en' : 'de';
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;700&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
