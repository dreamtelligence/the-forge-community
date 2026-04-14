'use client';

import { useEffect } from 'react';
import { useAIContext } from '@/app/context/AIContext';

export default function ForgeAIContextSetter({ context }: { context: string }) {
  const { setContext } = useAIContext();

  useEffect(() => {
    if (context) setContext(context);
  }, [context, setContext]);

  return null;
}
