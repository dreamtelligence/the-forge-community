import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/components/Providers";
import StructuredData from "@/app/components/StructuredData";
import { CookieBanner } from "@/shared/layout/cookie-banner";
import Script from "next/script";
import "./globals.css";
import { siteConfig } from "@/lib/seo";
import { cookies } from "next/headers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08090A",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "STAKE & SCALE | Community Venture Studio & AI Labs für Gründer",
    template: "%s | STAKE & SCALE"
  },
  description: siteConfig.description,
  keywords: [
    "venture studio",
    "startup gründen",
    "co-founder finden",
    "solo founder",
    "startup community",
    "sweat equity",
    "venture capital alternative",
    "startup infrastruktur",
    "ai startup tools",
    "lieferanten finden",
    "branding ai",
    "ai character swap",
    "ai avatar generator",
    "character animation",
    "startup marketing",
    "mitgründer suchen",
    "gründungsteam",
    "startup deutschland",
    "Marketing Studio",
    "Media Studio",
    "Copywriter",
    "Market Intel",
    "AI Prompts",
    "Avatar Studio",
    "Veo 3.1",
    "AI Generator",
    "AI Voice",
    "Forge Lab",
    "3D Camera Prompt Workbench",
    "Video AI",
    "AI Video Generation",
    "cinematic AI",
    "virtual camera",
    "AI video tools"
  ],
  authors: [{ name: "STAKE & SCALE Team" }],
  creator: "STAKE & SCALE",
  publisher: "STAKE & SCALE",
  alternates: {
    canonical: siteConfig.url,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "STAKE & SCALE | Community Venture Studio & AI Labs",
    description: "STAKE & SCALE bietet ein Community Venture Studio für Solo-Gründer, erweitert durch das Marketing Studio für Content- und Media-Erstellung und das Forge Lab für fortschrittliche AI-Video-Kreation. Baue dein Venture mit AI-powered Tools wie AI Voice, Avatar Studio, Veo 3.1 und der 3D Camera Prompt Workbench.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "STAKE & SCALE - Community Venture Studio & AI Labs für Solo-Gründer",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "STAKE & SCALE | Community Venture Studio & AI Labs",
    description: "STAKE & SCALE bietet ein Community Venture Studio für Solo-Gründer, erweitert durch das Marketing Studio für Content- und Media-Erstellung und das Forge Lab für fortschrittliche AI-Video-Kreation. Baue dein Venture mit AI-powered Tools wie AI Voice, Avatar Studio, Veo 3.1 und der 3D Camera Prompt Workbench.",
    images: ["/og-image.jpg"],
    creator: "@stakeandscale",
  },  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification
  },
};

const GTM_ID = "GTM-KCWVDFBN";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('forge_locale')?.value === 'en' ? 'en' : 'de';

  return (
    <html lang={locale}>
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;700&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />

        {/* Google Tag Manager with Consent Mode */}
        <Script
          id="gtm-consent-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;

              // Default consent: denied
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });

              // Check for existing consent
              try {
                const consent = localStorage.getItem('cookie-consent');
                if (consent) {
                  const parsed = JSON.parse(consent);
                  if (parsed.consented) {
                    gtag('consent', 'update', {
                      'analytics_storage': parsed.analytics ? 'granted' : 'denied',
                      'ad_storage': parsed.marketing ? 'granted' : 'denied',
                      'ad_user_data': parsed.marketing ? 'granted' : 'denied',
                      'ad_personalization': parsed.marketing ? 'granted' : 'denied'
                    });
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
      </head>
      <body
        className="antialiased"
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <StructuredData locale={locale} />
        <Providers>
          {children}
        </Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
