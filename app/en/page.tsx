import HomePage from '@/app/components/landing/kimi/HomePage';
import { getCopy } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'STAKE & SCALE | Community Venture Studio',
  description: 'Build your venture with AI‑powered tools, squads and end‑to‑end execution.',
};

export default async function HomeEn() {
  const copy = await getCopy('en');
  return <HomePage locale="en" copy={copy} />;
}
