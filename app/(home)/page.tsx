import HomePage from '@/components/landing/kimi/HomePage';
import { getCopy } from '@/lib/i18n';

export default async function Home() {
  const copy = await getCopy('de');
  return <HomePage locale="de" copy={copy} />;
}
