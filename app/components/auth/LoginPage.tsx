'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import { isCaseworkerCredentialsEnabled } from '@/lib/caseworker-login';

function mapAuthError(
  code: string | null,
  fallback: string,
  verificationError: string
): string | null {
  if (!code) {
    return null;
  }

  if (code === 'Verification') {
    return verificationError;
  }

  return fallback;
}

function LoginForm() {
  const { copy, link, locale } = useI18n();
  const searchParams = useSearchParams();
  const loginCopy = copy?.login ?? {};

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const caseworkerEnabled = isCaseworkerCredentialsEnabled();
  const [caseworkerUsername, setCaseworkerUsername] = useState('');
  const [caseworkerPassword, setCaseworkerPassword] = useState('');
  const [isCaseworkerSubmitting, setIsCaseworkerSubmitting] = useState(false);
  const [caseworkerError, setCaseworkerError] = useState<string | null>(null);

  const queryError = useMemo(
    () =>
      mapAuthError(
        searchParams.get('error'),
        loginCopy.errorGeneric || 'Something went wrong.',
        loginCopy.errorVerification || 'Verification failed.'
      ),
    [searchParams, locale, loginCopy.errorGeneric, loginCopy.errorVerification]
  );

  const effectiveError = submitError || queryError;
  const verifyRequested = searchParams.get('verify') === 'true';
  const localizedCaseworkerError =
    locale === 'en'
      ? 'Invalid caseworker credentials.'
      : 'Ungueltiger Sachbearbeiter-Login.';

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signIn('resend', {
        email: normalizedEmail,
        redirect: false,
        callbackUrl: '/forum',
      });

      if (result?.error) {
        const message = mapAuthError(
          result.error,
          loginCopy.errorGeneric || 'Something went wrong.',
          loginCopy.errorVerification || 'Verification failed.'
        );
        setSubmitError(message || loginCopy.errorGeneric || 'Something went wrong.');
        setSentToEmail(null);
        return;
      }

      setSentToEmail(normalizedEmail);
    } catch {
      setSubmitError(loginCopy.errorNetwork || 'Network error.');
      setSentToEmail(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCaseworkerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = caseworkerUsername.trim().toLowerCase();
    if (!normalizedUsername || !caseworkerPassword || isCaseworkerSubmitting) {
      return;
    }

    setCaseworkerError(null);
    setIsCaseworkerSubmitting(true);

    try {
      const result = await signIn('credentials', {
        username: normalizedUsername,
        password: caseworkerPassword,
        redirect: false,
        callbackUrl: '/admin',
      });

      if (result?.error) {
        setCaseworkerError(localizedCaseworkerError);
        return;
      }

      window.location.href = result?.url || '/admin';
    } catch {
      setCaseworkerError(loginCopy.errorNetwork || 'Network error.');
    } finally {
      setIsCaseworkerSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md relative z-10">
      <div className="text-center mb-12">
        <Link href={link('/')} className="inline-flex flex-col mb-8 group">
          <span className="font-caveat text-4xl tracking-normal text-white group-hover:text-[#FF9900] transition-colors lowercase">
            stake & scale
          </span>
        </Link>
        <h1 className="text-4xl font-instrument-serif text-white mb-3">{loginCopy.title}</h1>
        <p className="text-white/40 text-sm uppercase tracking-widest font-bold">{loginCopy.subtitle}</p>
      </div>

      <div className="glass-card p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/70 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-radial from-[#FF9900]/10 via-transparent to-transparent animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FF9900]/5 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        <form onSubmit={handleEmailSubmit} className="relative z-10 space-y-6">
          {effectiveError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-300 leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{effectiveError}</span>
            </div>
          )}

          {(sentToEmail || verifyRequested) && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3 text-xs text-green-300 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold">{loginCopy.verifyTitle || 'Check your inbox'}</span>{' '}
                {(loginCopy.verifyBody || 'We sent a magic link to') + ' '}
                <span className="text-green-200">{sentToEmail || email}</span>.{' '}
                {loginCopy.verifyBodySuffix || 'Click the link in the email to sign in.'}{' '}
                <span className="opacity-80">{loginCopy.spamHint || ''}</span>
              </span>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3 ml-1"
            >
              {loginCopy.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder={loginCopy.emailPlaceholder}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#FF9900]/60"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="w-full bg-[#FF9900] text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-[#FF9900]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? loginCopy.submitLoading : loginCopy.submitIdle}
          </button>
        </form>

        {caseworkerEnabled && (
          <div className="relative z-10 mt-8 space-y-4 border-t border-white/10 pt-6">
            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
              {locale === 'en' ? 'Caseworker login (password)' : 'Sachbearbeiter Login (Passwort)'}
            </div>

            {caseworkerError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                {caseworkerError}
              </div>
            )}

            <form onSubmit={handleCaseworkerSubmit} className="space-y-3">
              <input
                type="text"
                value={caseworkerUsername}
                onChange={(event) => setCaseworkerUsername(event.target.value)}
                autoComplete="username"
                required
                placeholder={locale === 'en' ? 'Username or email' : 'Benutzername oder E-Mail'}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#FF9900]/60"
              />
              <input
                type="password"
                value={caseworkerPassword}
                onChange={(event) => setCaseworkerPassword(event.target.value)}
                autoComplete="current-password"
                required
                placeholder={locale === 'en' ? 'Password' : 'Passwort'}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#FF9900]/60"
              />
              <button
                type="submit"
                disabled={!caseworkerUsername.trim() || !caseworkerPassword || isCaseworkerSubmitting}
                className="w-full border border-white/20 bg-white/5 text-white font-bold py-3 rounded-xl transition-all uppercase text-[10px] tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCaseworkerSubmitting
                  ? locale === 'en'
                    ? 'Signing in...'
                    : 'Melde an...'
                  : locale === 'en'
                    ? 'Sign in as caseworker'
                    : 'Als Sachbearbeiter einloggen'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-12 text-center flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
        <Shield className="w-3.5 h-3.5" />
        <span>{loginCopy.securityNote}</span>
      </div>
    </div>
  );
}

export default function LoginPageClient() {
  const { copy } = useI18n();

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />
      <Suspense
        fallback={
          <div className="text-white/20 text-[10px] font-bold uppercase tracking-widest animate-pulse">
            {copy?.login?.loadingFallback}
          </div>
        }
      >
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <LoginForm />
        </motion.div>
      </Suspense>
    </div>
  );
}
