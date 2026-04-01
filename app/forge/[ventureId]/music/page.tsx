'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Music } from 'lucide-react';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { MusicStudio } from '@/app/components/forge/MusicStudio';
import { useAIContext } from '@/app/context/AIContext';
import type { BrandDNA } from '@prisma/client';

export default function MusicPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setContext('Music & Sounds Studio - lizenzierte Audio Assets.');
  }, [setContext]);

  useEffect(() => {
    const loadBrandDNA = async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/brand-dna`);
        if (res.ok) {
          const data = await res.json();
          setBrandDNA(data);
        }
      } catch (error) {
        console.error('Failed to load Brand DNA', error);
      } finally {
        setLoading(false);
      }
    };
    loadBrandDNA();
  }, [ventureId]);

  if (loading) {
    return <div className="text-white p-8">Lade Studio...</div>;
  }

  return (
    <StudioShell
      title="Music & Sounds"
      description="Lizenzierte Musik & Soundeffekte direkt für deine Videos."
      icon={<Music className="w-6 h-6 text-[#FF9900]" />}
      brandDNA={brandDNA}
    >
      <MusicStudio ventureId={ventureId} />
    </StudioShell>
  );
}
