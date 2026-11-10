import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'STAKE & SCALE — Design Showcase',
  description: 'Archiviertes Landingpage- und Interface-Designprojekt. Das ursprüngliche Stake & Scale Produkt ist eingestellt; Login und Registrierung sind deaktiviert.',
  alternates: { canonical: 'https://the-forge-community.vercel.app/' },
  robots: { index: false, follow: false },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
