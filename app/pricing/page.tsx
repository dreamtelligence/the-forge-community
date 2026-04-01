import { I18nProvider } from '@/app/components/i18n/I18nProvider';
import PricingPageClient from '@/app/components/pricing/PricingPage';
import { getCopy } from '@/lib/i18n';

export default async function PricingPage() {
  const copy = await getCopy('de');
  return (
    <I18nProvider locale="de" copy={copy}>
      <PricingPageClient />
    </I18nProvider>
  );
}
