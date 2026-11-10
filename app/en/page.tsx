import HomePage from '@/components/landing/kimi/HomePage';
import { getCopy } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'STAKE & SCALE — Design Showcase',
  description: 'Archived landing page and interface design concept. The original Stake & Scale product is no longer active; login and sign-up are disabled.',
  alternates: { canonical: 'https://the-forge-community.vercel.app/en' },
  robots: { index: false, follow: false },
};

export default async function HomeEn() {
  const copy = await getCopy('en');
  return <HomePage locale="en" copy={copy} />;
}
