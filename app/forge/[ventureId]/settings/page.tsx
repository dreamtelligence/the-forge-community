'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import type { BrandDNA } from '@prisma/client';

export default function VentureSettingsPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;

  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [] = useState(false);
  const [] = useState('');
  const [] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/ventures/${ventureId}/brand-dna`);
        if (res.ok) {
          const data = await res.json();
          setBrandDNA(data);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ventureId]);

  if (loading) return <div className="text-white p-8">Lade Einstellungen...</div>;

  return (
    <StudioShell
      title="Venture Settings"
      description="Verwalte die Konfiguration deines Ventures."
      icon={<Settings className="w-6 h-6 text-[#FF9900]" />}
      brandDNA={brandDNA}
    >
      <div className="max-w-2xl space-y-8">
        <div className="glass-card p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-instrument-serif text-white">Allgemeine Einstellungen</h2>
          <p className="text-sm text-white/50">
            Hier kannst du venture-spezifische Optionen anpassen. (Aktuell in Entwicklung)
          </p>
          
          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center gap-3 text-[#FF9900] bg-[#FF9900]/5 border border-[#FF9900]/20 p-4 rounded-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs">
                  Erweiterte Einstellungen für API-Provider und Webhooks folgen in Kürze.
                </p>
             </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={true}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white/40 rounded-xl text-sm font-bold cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Speichern
          </button>
        </div>
      </div>
    </StudioShell>
  );
}
