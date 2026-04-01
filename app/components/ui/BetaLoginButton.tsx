'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getBetaApplicationEmail, getClosedBetaLoginMessage } from '@/lib/beta-access';

type BetaLoginButtonProps = {
  label: string;
  className?: string;
  wrapperClassName?: string;
  tooltipClassName?: string;
  locale?: 'de' | 'en';
  showIcon?: boolean;
  onClick?: () => void;
};

export default function BetaLoginButton({
  label,
  className,
  wrapperClassName,
  tooltipClassName,
  locale = 'de',
  showIcon = true,
  onClick,
}: BetaLoginButtonProps) {
  const router = useRouter();
  const email = getBetaApplicationEmail();
  const tooltip = getClosedBetaLoginMessage(locale);
  const loginPath = locale === 'en' ? '/en/login' : '/login';

  return (
    <div className={cn('group relative inline-flex max-w-full', wrapperClassName)}>
      <button
        type="button"
        title={tooltip}
        onClick={(event) => {
          event.preventDefault();
          if (onClick) {
            onClick();
            return;
          }
          router.push(loginPath);
        }}
        className={cn('cursor-pointer opacity-80', className)}
      >
        <span>{label}</span>
        {showIcon && <Lock className="h-3.5 w-3.5 shrink-0 opacity-80" />}
      </button>

      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-[18rem] -translate-x-1/2 translate-y-1 rounded-xl border border-white/15 bg-black/95 p-3 text-left opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100',
          tooltipClassName
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
          {tooltip}
        </p>
        <a
          href={`mailto:${email}`}
          className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF9900] hover:text-[#ffb347]"
        >
          {email}
        </a>
      </div>
    </div>
  );
}
