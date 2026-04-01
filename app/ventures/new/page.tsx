'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/app/components/AuthGuard';
import PageShell from '@/app/components/PageShell';
import { createVenture, updateVentureStep } from '@/app/actions/ventures';
import { ArrowRight, ArrowLeft, Check, Rocket, Package, Code, Briefcase, Camera, MoreHorizontal } from 'lucide-react';

const VENTURE_TYPES = [
  {
    id: 'ECOMMERCE',
    name: 'E-Commerce',
    description: 'Physische oder digitale Produkte verkaufen',
    icon: Package,
    duration: '90 Tage'
  },
  {
    id: 'SAAS',
    name: 'SaaS',
    description: 'Software-as-a-Service Produkt',
    icon: Code,
    duration: '120 Tage'
  },
  {
    id: 'SERVICE',
    name: 'Service Business',
    description: 'Dienstleistungen (Agency, Consulting)',
    icon: Briefcase,
    duration: '60 Tage'
  },
  {
    id: 'INFLUENCER',
    name: 'Influencer',
    description: 'Creator Brand, Content & Community',
    icon: Camera,
    duration: '75 Tage'
  },
  {
    id: 'OTHER',
    name: 'Sonstiges',
    description: 'Eigenes Modell definieren',
    icon: MoreHorizontal,
    duration: 'flexibel'
  }
];

export default function NewVenturePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Type Selection
    type: '',
    typeLabel: '',

    // Step 2: Basic Info
    name: '',
    description: '',
    targetMarket: '',

    // Step 3: Product/Service
    productType: '',

    // Step 4: Pricing
    pricing: {
      basePrice: '',
      currency: 'EUR'
    },

    // Step 5: Marketing
    marketingBudget: '',
    totalBudget: '',

    // Step 6: Timeline
    launchDate: ''
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      type: typeId,
      typeLabel: typeId === 'OTHER' ? prev.typeLabel : ''
    }));
  };

  const handleNext = async () => {
    if (currentStep === 6) {
      // Final step - create venture
      await handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const venture = await createVenture({
        name: formData.name,
        type: formData.type,
        description: formData.description,
        typeLabel: formData.type === 'OTHER' ? formData.typeLabel.trim() : undefined
      });

      // Update venture with all wizard data
      await updateVentureStep(venture.id, 1, {
        productType: formData.productType,
        targetMarket: formData.targetMarket,
        pricing: formData.pricing,
        marketingBudget: parseFloat(formData.marketingBudget) || 0,
        totalBudget: parseFloat(formData.totalBudget) || 0,
        launchDate: formData.launchDate
      });

      router.push(`/ventures/${venture.id}`);
    } catch (error) {
      console.error('Failed to create venture:', error);
      alert('Fehler beim Erstellen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.type !== '' &&
          (formData.type !== 'OTHER' || formData.typeLabel.trim().length >= 2)
        );
      case 2:
        return formData.name.length >= 2;
      case 3:
        return formData.productType.length >= 3;
      case 4:
        return formData.pricing.basePrice !== '';
      case 5:
        return formData.marketingBudget !== '';
      case 6:
        return formData.launchDate !== '';
      default:
        return false;
    }
  };

  return (
    <AuthGuard>
      <PageShell>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-5xl font-instrument-serif text-white tracking-tight mb-4">
              Neues Venture
            </h1>
            <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">
              Schritt-für-Schritt durch den Launch
            </p>
          </header>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                    step <= currentStep
                      ? 'bg-[#FF9900]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
              Schritt {currentStep} von 6
            </p>
          </div>

          {/* Wizard Content */}
          <div className="glass-card rounded-3xl border border-white/10 p-12 min-h-[500px]">
            {/* Step 1: Venture Type */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Venture-Typ wählen
                  </h2>
                  <p className="text-white/50 text-sm">
                    Wähle den Typ, der am besten zu deiner Idee passt. Jeder Typ hat einen angepassten Workflow.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {VENTURE_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={`p-8 rounded-2xl border-2 transition-all text-left ${
                          formData.type === type.id
                            ? 'border-[#FF9900] bg-[#FF9900]/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <Icon className={`w-10 h-10 mb-6 ${
                          formData.type === type.id ? 'text-[#FF9900]' : 'text-white/40'
                        }`} />
                        <h3 className="text-xl font-instrument-serif text-white mb-2">
                          {type.name}
                        </h3>
                        <p className="text-xs text-white/50 mb-4">
                          {type.description}
                        </p>
                        <p className="text-[10px] text-[#FF9900] font-bold uppercase tracking-widest">
                          ≈ {type.duration}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {formData.type === 'OTHER' && (
                  <div className="mt-6">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Dein Venture-Typ
                    </label>
                    <input
                      type="text"
                      value={formData.typeLabel}
                      onChange={(e) => updateField('typeLabel', e.target.value)}
                      placeholder="z.B. Influencer, Education, Community, Media..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                    />
                    <p className="mt-2 text-xs text-white/40">
                      Dieser Name wird in deinem Venture angezeigt.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Grundinformationen
                  </h2>
                  <p className="text-white/50 text-sm">
                    Name und Beschreibung deines Ventures
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Venture-Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="z.B. SmartStore Fulfillment"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Kurzbeschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Was macht dein Venture? Welches Problem löst es?"
                      rows={4}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Zielmarkt
                    </label>
                    <input
                      type="text"
                      value={formData.targetMarket}
                      onChange={(e) => updateField('targetMarket', e.target.value)}
                      placeholder="z.B. D-A-CH, Europa, Global"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Product Type */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Produkt/Service Details
                  </h2>
                  <p className="text-white/50 text-sm">
                    Was genau bietest du an?
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                    {formData.type === 'ECOMMERCE' ? 'Produktkategorie' :
                     formData.type === 'SAAS' ? 'Software-Typ' :
                     formData.type === 'INFLUENCER' ? 'Creator-Nische' :
                     formData.type === 'OTHER' ? 'Kategorie' :
                     'Service-Typ'}
                  </label>
                  <input
                    type="text"
                    value={formData.productType}
                    onChange={(e) => updateField('productType', e.target.value)}
                    placeholder={
                      formData.type === 'ECOMMERCE' ? 'z.B. Fashion, Electronics, Food' :
                      formData.type === 'SAAS' ? 'z.B. CRM, Analytics, Automation' :
                      formData.type === 'INFLUENCER' ? 'z.B. Fitness, Finance, Lifestyle' :
                      formData.type === 'OTHER' ? 'z.B. Education, Community, Media' :
                      'z.B. Marketing Agency, Development, Consulting'
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Preisstrategie
                  </h2>
                  <p className="text-white/50 text-sm">
                    Wie viel soll dein Produkt/Service kosten?
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Basispreis
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        value={formData.pricing.basePrice}
                        onChange={(e) => updateField('pricing', { ...formData.pricing, basePrice: e.target.value })}
                        placeholder="99"
                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                      />
                      <select
                        value={formData.pricing.currency}
                        onChange={(e) => updateField('pricing', { ...formData.pricing, currency: e.target.value })}
                        className="bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-2">💡 Tipp</p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Research Konkurrenten und kalkuliere deine Kosten. Eine gesunde Marge liegt bei 30-50% für E-Commerce, 70-90% für SaaS.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Budget */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Budget-Planung
                  </h2>
                  <p className="text-white/50 text-sm">
                    Wie viel Kapital planst du einzusetzen?
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Marketing Budget (monatlich)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.marketingBudget}
                        onChange={(e) => updateField('marketingBudget', e.target.value)}
                        placeholder="500"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                      Gesamt-Budget (initial)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.totalBudget}
                        onChange={(e) => updateField('totalBudget', e.target.value)}
                        placeholder="5000"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Launch Date */}
            {currentStep === 6 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-instrument-serif text-white mb-3">
                    Launch-Timeline
                  </h2>
                  <p className="text-white/50 text-sm">
                    Wann planst du live zu gehen?
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
                    Geplantes Launch-Datum
                  </label>
                  <input
                    type="date"
                    value={formData.launchDate}
                    onChange={(e) => updateField('launchDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all"
                  />
                </div>

                <div className="p-8 bg-gradient-to-br from-[#FF9900]/10 to-transparent border border-[#FF9900]/20 rounded-2xl">
                  <Rocket className="w-12 h-12 text-[#FF9900] mb-4" />
                  <h3 className="text-xl font-instrument-serif text-white mb-2">Bereit?</h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Dein Venture wird mit einem vollständigen Workflow und Tasks erstellt.
                    Du bekommst automatisch Deadlines basierend auf dem Launch-Datum.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/10">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="inline-flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="inline-flex items-center gap-3 bg-[#FF9900] text-black px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {currentStep === 6 ? 'Venture erstellen' : 'Weiter'}
                {currentStep === 6 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
