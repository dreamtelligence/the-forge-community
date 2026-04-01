import { I18nProvider } from '@/app/components/i18n/I18nProvider';
import LoginPageClient from '@/app/components/auth/LoginPage';
import { getCopy } from '@/lib/i18n';

export default async function LoginPage() {
  const copy = await getCopy('en');
  return (
    <I18nProvider locale="en" copy={copy}>
      <LoginPageClient />
    </I18nProvider>
  );
}
