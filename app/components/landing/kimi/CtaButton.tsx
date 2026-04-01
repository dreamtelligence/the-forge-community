'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type CtaButtonProps = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
};

export default function CtaButton({
  label,
  href,
  onClick,
  variant = 'outline',
  size = 'md',
  className,
  target,
  rel,
  type = 'button',
}: CtaButtonProps) {
  const base =
    'group inline-flex items-center justify-center rounded-full border transition-all duration-300 uppercase tracking-[0.2em] font-black overflow-hidden relative active:scale-[0.98]';
  
  const sizes = {
    sm: 'px-5 py-2.5 text-[10px]',
    md: 'px-8 py-3.5 text-[11px]',
    lg: 'px-10 py-4.5 text-[12px]',
  };

  const variants = {
    primary: 'bg-white text-black border-transparent hover:bg-neutral-200',
    outline: 'bg-transparent text-white border-white/20 hover:bg-white hover:text-black hover:border-white',
  };

  const classes = cn(base, sizes[size], variants[variant], className);

  const content = <span className="relative z-10">{label}</span>;

  if (href) {
    if (href.startsWith('#') || href.startsWith('mailto:')) {
      return (
        <a href={href} className={classes} target={target} rel={rel}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} target={target} rel={rel}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}


