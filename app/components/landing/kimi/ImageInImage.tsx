'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type ImageInImageProps = {
  mainSrc: string;
  insetSrc: string;
  alt?: string;
  className?: string;
};

export default function ImageInImage({ mainSrc, insetSrc, alt, className }: ImageInImageProps) {
  return (
    <div className={cn('group relative aspect-[4/3] shadow-2xl', className)}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden -rotate-[1.5deg]">
        <Image
          src={mainSrc}
          alt={alt ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>
      <div className="absolute -bottom-6 -right-6 w-40 sm:w-48 lg:w-56 aspect-[3/4] rounded-xl overflow-hidden border border-white/20 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] rotate-[2.5deg]">
        <Image
          src={insetSrc}
          alt={alt ? `${alt} Detailansicht` : 'Detail Bild'}
          fill
          sizes="(max-width: 768px) 200px, (max-width: 1024px) 240px, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          priority
        />
      </div>
    </div>
  );
}
