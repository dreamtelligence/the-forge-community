'use client';

import BetaLoginButton from '@/app/components/ui/BetaLoginButton';

export default function LoginFormInline() {
  return (
    <div className="space-y-4">
      <BetaLoginButton
        label="Magic Link Login"
        locale="de"
        wrapperClassName="w-full"
        className="w-full bg-white text-black font-black py-4 rounded-xl transition-all flex items-center justify-center uppercase text-[10px] tracking-[0.2em]"
      />

      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/40">
        Öffne den Login und fordere dort deinen Magic Link an.
      </p>
    </div>
  );
}
