'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  locale = 'de',
  onClick,
}: BetaLoginButtonProps) {
  const router = useRouter();
  const loginPath = locale === 'en' ? '/en/login' : '/login';

  return (
    <div className={cn('inline-flex max-w-full', wrapperClassName)}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          if (onClick) {
            onClick();
            return;
          }
          router.push(loginPath);
        }}
        className={cn('cursor-pointer', className)}
      >
        {label}
      </button>
    </div>
  );
}
