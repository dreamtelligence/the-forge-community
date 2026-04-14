'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { NotionSyncDialog } from './notion-sync-dialog';

interface NotionExportButtonProps {
  ventureId: string;
  ventureName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function NotionExportButton({
  ventureId,
  ventureName,
  variant = 'outline',
  size = 'sm',
  className,
}: NotionExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <svg className="h-4 w-4 mr-2" viewBox="0 0 100 100" fill="currentColor">
          <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" fillOpacity=".2"/>
          <path d="M61.35 1.227l-55.3 4.08c-4.493.387-6.053 3.307-6.053 6.807v60.663c0 2.727.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.147c-4.273-3.107-6.02-3.5-12.817-2.92zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.387 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.933 3.307-.193.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L81.8 22.58c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.967-5.043-3.883zM74.9 33.767c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.397.777c-.39-.777 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z"/>
        </svg>
        Export to Notion
      </Button>

      <NotionSyncDialog
        ventureId={ventureId}
        ventureName={ventureName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
