'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Save, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useAIContext } from '@/app/context/AIContext';
import BrandKitExport from '@/components/brand/BrandKitExport';

interface BrandDNA {
  id?: string;
  brandName: string;
  tagline: string;
  mission: string;
  vision: string;
  values: string[];
  toneOfVoice: string;
  personality: string[];
  writingStyle: string;
  targetAudience: {
    age: string;
    gender: string;
    location: string;
    interests: string[];
  };
  customerPersona: string;
  primaryColor: string;
  secondaryColors: string[];
  logoUrl: string;
  fontFamily: string;
  productCategory: string;
  keyFeatures: string[];
  usp: string;
  competitors: Array<{ name: string; url: string; strengths: string[] }>;
  aiContext: string;
  doNotMention: string[];
}

export default function BrandDNAPage() {
  const params = useParams();
  const ventureId = params.ventureId as string;
  const { setContext } = useAIContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BrandDNA>({
    brandName: '',
    tagline: '',
    mission: '',
    vision: '',
    values: [],
    toneOfVoice: '',
    personality: [],
    writingStyle: '',
    targetAudience: { age: '', gender: 'all', location: '', interests: [] },
    customerPersona: '',
    primaryColor: '#FF9900',
    secondaryColors: [],
    logoUrl: '',
    fontFamily: 'Inter, sans-serif',
    productCategory: '',
    keyFeatures: [],
    usp: '',
    competitors: [],
    aiContext: '',
    doNotMention: [],
  });

  useEffect(() => {
    setContext('Brand Studio - Brand DNA, Tonalität, Guidelines & Assets.');
  }, [setContext]);

  const fetchBrandDNA = async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/brand-dna`);
      if (res.ok) {
        const brandDNA = await res.json();
        if (brandDNA) {
          setData((prev) => ({
            ...prev,
            ...brandDNA,
            values: brandDNA.values ?? [],
            personality: brandDNA.personality ?? [],
            secondaryColors: brandDNA.secondaryColors ?? [],
            keyFeatures: brandDNA.keyFeatures ?? [],
            doNotMention: brandDNA.doNotMention ?? [],
            competitors: Array.isArray(brandDNA.competitors) ? brandDNA.competitors : [],
            targetAudience: brandDNA.targetAudience ?? prev.targetAudience,
          }));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Marken-DNA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandDNA();
  }, [ventureId]);

  const addCompetitor = () => {
    setData((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', url: '', strengths: [] }],
    }));
  };

  const updateCompetitor = (
    index: number,
    field: 'name' | 'url' | 'strengths',
    value: string
  ) => {
    setData((prev) => {
      const next = [...prev.competitors];
      const current = next[index] ?? { name: '', url: '', strengths: [] };
      if (field === 'strengths') {
        current.strengths = value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      } else {
        current[field] = value;
      }
      next[index] = current;
      return { ...prev, competitors: next };
    });
  };

  const removeCompetitor = (index: number) => {
    setData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/brand-dna`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert('Marken-DNA gespeichert!');
      } else {
        alert('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Marken-DNA:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-white">Laden...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 sm:mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF9900]" />
            <h1 className="text-2xl sm:text-4xl font-instrument-serif text-white">
              Marken-DNA
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/60">
            Definiere deine Markenidentität für KI-gestützte Inhaltserstellung
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <BrandKitExport data={data} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#FF9900] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-[11px] sm:text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? '...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Core Identity */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Kernidentität</h2>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Markenname *
          </label>
          <input
            type="text"
            value={data.brandName}
            onChange={(e) => setData({ ...data, brandName: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. EcoWear"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Slogan
          </label>
          <input
            type="text"
            value={data.tagline}
            onChange={(e) => setData({ ...data, tagline: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Nachhaltige Mode für Alle"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Mission (Warum existiert ihr?)
          </label>
          <textarea
            value={data.mission}
            onChange={(e) => setData({ ...data, mission: e.target.value })}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            placeholder="z.B. Nachhaltige Mode zugänglich und erschwinglich machen"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Vision (Wo wollt ihr hin?)
          </label>
          <textarea
            value={data.vision}
            onChange={(e) => setData({ ...data, vision: e.target.value })}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            placeholder="z.B. Die führende nachhaltige Modemarke in Europa werden"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Markenwerte (kommagetrennt)
          </label>
          <input
            type="text"
            value={data.values.join(', ')}
            onChange={(e) =>
              setData({ ...data, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
            }
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Nachhaltigkeit, Qualität, Transparenz"
          />
        </div>
      </section>

      {/* Voice & Tone */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Stimme & Ton</h2>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Tonfall
          </label>
          <select
            value={data.toneOfVoice}
            onChange={(e) => setData({ ...data, toneOfVoice: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
          >
            <option value="">Auswählen...</option>
            <option value="Professional">Professionell</option>
            <option value="Casual">Locker</option>
            <option value="Friendly">Freundlich</option>
            <option value="Edgy">Kantig/Provokant</option>
            <option value="Playful">Verspielt</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Persönlichkeitsmerkmale (kommagetrennt)
          </label>
          <input
            type="text"
            value={data.personality.join(', ')}
            onChange={(e) =>
              setData({ ...data, personality: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
            }
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Mutig, Authentisch, Fürsorglich"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Schreibstil
          </label>
          <input
            type="text"
            value={data.writingStyle}
            onChange={(e) => setData({ ...data, writingStyle: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Kurz & bündig, Detailliert & informativ"
          />
        </div>
      </section>

      {/* Target Audience */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Zielgruppe</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
              Altersgruppe
            </label>
            <input
              type="text"
              value={data.targetAudience.age}
              onChange={(e) =>
                setData({ ...data, targetAudience: { ...data.targetAudience, age: e.target.value } })
              }
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
              placeholder="z.B. 25-40"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
              Standort
            </label>
            <input
              type="text"
              value={data.targetAudience.location}
              onChange={(e) =>
                setData({ ...data, targetAudience: { ...data.targetAudience, location: e.target.value } })
              }
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
              placeholder="z.B. EU, DACH, Global"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Kunden-Persona
          </label>
          <textarea
            value={data.customerPersona}
            onChange={(e) => setData({ ...data, customerPersona: e.target.value })}
            rows={4}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            placeholder="Beschreibe deinen idealen Kunden..."
          />
        </div>
      </section>

      {/* Product/Service */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Produkt/Dienstleistung</h2>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Kategorie
          </label>
          <input
            type="text"
            value={data.productCategory}
            onChange={(e) => setData({ ...data, productCategory: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Mode, Essen, SaaS"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Hauptmerkmale (kommagetrennt)
          </label>
          <input
            type="text"
            value={data.keyFeatures.join(', ')}
            onChange={(e) =>
              setData({ ...data, keyFeatures: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
            }
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
            placeholder="z.B. Bio, Handgemacht, Nachhaltig"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            USP (Alleinstellungsmerkmal)
          </label>
          <textarea
            value={data.usp}
            onChange={(e) => setData({ ...data, usp: e.target.value })}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            placeholder="Was macht euch einzigartig?"
          />
        </div>
      </section>

      {/* Competitors */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Wettbewerb</h2>
            <p className="text-xs sm:text-sm text-white/40">
              Trage direkte Konkurrenten ein, damit Market Intel & Watchdog sauber arbeiten.
            </p>
          </div>
          <button
            type="button"
            onClick={addCompetitor}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>

        {data.competitors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-5 sm:p-6 text-xs sm:text-sm text-white/40">
            Noch keine Konkurrenten. Füge mindestens 1–3 Marken hinzu.
          </div>
        ) : (
          <div className="space-y-4">
            {data.competitors.map((comp, index) => (
              <div
                key={`${comp.name}-${index}`}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Konkurrent {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCompetitor(index)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Entfernen
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={comp.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
                      placeholder="z.B. Brand X"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
                      URL
                    </label>
                    <input
                      type="text"
                      value={comp.url}
                      onChange={(e) => updateCompetitor(index, 'url', e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
                    Stärken (kommagetrennt)
                  </label>
                  <input
                    type="text"
                    value={(comp.strengths || []).join(', ')}
                    onChange={(e) => updateCompetitor(index, 'strengths', e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
                    placeholder="z.B. Preis, Qualität, Community"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Context */}
      <section className="glass-card p-5 sm:p-8 rounded-2xl border border-white/10 space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-instrument-serif text-white">KI-Kontext</h2>

        <div>
          <label className="block text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">
            Spezielle Anweisungen für die KI
          </label>
          <textarea
            value={data.aiContext}
            onChange={(e) => setData({ ...data, aiContext: e.target.value })}
            rows={4}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#FF9900] focus:ring-0 outline-none transition-all resize-none"
            placeholder="z.B. Erwähne immer Nachhaltigkeit, vermeide Vergleiche mit Fast Fashion"
          />
          <p className="text-[10px] sm:text-xs text-white/40 mt-2">
            Diese Anweisungen werden von der KI bei der Erstellung von Inhalten für deine Marke verwendet
          </p>
        </div>
      </section>

      {/* Save Button (sticky) */}
      <div className="sticky bottom-4 sm:bottom-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#FF9900] text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[11px] sm:text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-2xl"
        >
          <Save className="w-4 h-4 sm:w-5 sm:h-5" />
          {saving ? 'Speichern...' : 'Marken-DNA speichern'}
        </button>
      </div>
    </div>
  );
}
