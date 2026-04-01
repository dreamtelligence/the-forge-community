'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/app/components/i18n/I18nProvider';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';
import {
  getClosedBetaLoginMessage,
  getClosedBetaLoginShortLabel,
} from '@/lib/beta-access';

export default function SignupCard() {
  const { copy, link, locale } = useI18n();
  const betaMessage = getClosedBetaLoginMessage(locale);
  const betaShortLabel = getClosedBetaLoginShortLabel(locale);
  const [errorMessage, setErrorMessage] = useState(betaMessage);
  const [formData, setFormData] = useState({
    email: '',
    agreeToTerms: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(betaMessage);
  };

  return (
    <div className="flex flex-col md:flex-row w-full bg-[#0C0E10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[600px] sm:min-h-[560px] md:min-h-[520px]">
      {/* Left Panel - Image Section */}
      <div className="flex-1 relative overflow-hidden min-h-[460px] sm:min-h-[420px] md:min-h-0 bg-black group">
        <img
          src="/galaxy_astronaut.webp"
          alt="Stake & Scale"
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-all duration-700 scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/20 to-transparent pointer-events-none" />
        
        <div className="absolute inset-0 flex items-start md:items-end px-6 pt-8 pb-10 sm:p-10 pointer-events-none">
          <div className="max-w-lg text-white">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              {copy?.signup?.leftTitleLines?.map((line: string, index: number) => (
                <span key={line}>
                  {line}
                  {index < (copy?.signup?.leftTitleLines?.length || 0) - 1 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-white/80 text-base leading-relaxed mb-6">
              {copy?.signup?.leftBody}
            </p>
            <div className="space-y-2 text-white/70 text-sm">
              {(copy?.signup?.leftBullets || []).map((bullet: string) => (
                <div key={bullet}>• {bullet}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 p-8 flex flex-col justify-center md:border-l border-white/10 bg-black/40">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{copy?.signup?.title}</h1>
          <p className="text-white/50">{copy?.signup?.description}</p>
          <div className="mt-5">
            <BetaLoginButton
              label={copy?.signup?.loginText || 'Login'}
              locale={locale}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
              {copy?.signup?.emailLabel}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={copy?.signup?.emailPlaceholder}
              disabled
              className="w-full cursor-not-allowed px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white/50 outline-none transition-all placeholder:text-white/20"
              required
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              disabled
              className="w-4 h-4 bg-white/5 border-white/20 text-royal rounded opacity-40"
              required
            />
            <label htmlFor="agreeToTerms" className="text-sm text-white/50">
              {copy?.signup?.termsPrefix}{' '}
              <Link href={link('/legal/agb')} className="text-white font-medium hover:underline">
                {copy?.signup?.termsLink}
              </Link>
            </label>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled
            title={betaMessage}
            className="w-full cursor-not-allowed bg-white/10 text-white/60 py-4 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {betaShortLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
