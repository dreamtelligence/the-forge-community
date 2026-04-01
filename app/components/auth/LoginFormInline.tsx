'use client';

import { AlertCircle } from 'lucide-react';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';
import {
  getBetaApplicationEmail,
  getClosedBetaLoginMessage,
  getClosedBetaLoginShortLabel,
} from '@/lib/beta-access';

export default function LoginFormInline() {
  const locale: 'de' | 'en' = 'de';
  const betaEmail = getBetaApplicationEmail();
  const betaMessage = getClosedBetaLoginMessage(locale);
  const betaShortLabel = getClosedBetaLoginShortLabel(locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-red-300 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5" />
        {betaMessage}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">
            Email Addresse
          </label>
          <input
            type="email"
            disabled
            placeholder="founder@theforge.system"
            className="w-full cursor-not-allowed bg-white/2 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white/40 outline-none transition-all placeholder:text-white/10"
          />
        </div>

        <BetaLoginButton
          label={betaShortLabel}
          locale={locale}
          wrapperClassName="w-full"
          className="w-full bg-white text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em]"
        />
      </form>

      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/10">
        <div className="h-px flex-1 bg-white/5" />
        <span>oder</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <BetaLoginButton
        label="Google Login"
        locale={locale}
        wrapperClassName="w-full"
        className="w-full border border-white/10 bg-white/5 text-white/80 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em]"
      />

      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/40">
        Bewerbung per Mail:{' '}
        <a href={`mailto:${betaEmail}`} className="text-[#FF9900] hover:underline">
          {betaEmail}
        </a>
      </p>
    </div>
  );
}
