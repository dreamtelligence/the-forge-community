/**
 * Contract Generator Page
 * Form to create new legal documents with AI
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { AIGenerator } from '@/components/forge/AIGenerator';
import { DocumentExport } from '@/components/forge/DocumentExport';
import { Scale, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { LEGAL_DOCUMENT_TEMPLATES, type LegalDocumentType } from '@/types/legal';
import { LegalContextInjector } from '@/components/forge/LegalContextInjector';

export default function ContractGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams<{ ventureId: string }>();
  const ventureId = routeParams?.ventureId ?? '';
  const templateId = searchParams.get('template');

  const [selectedTemplate, setSelectedTemplate] = useState<LegalDocumentType | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    documentTitle: '',
    partnerCompanyName: '',
    partnerContactName: '',
    partnerContactEmail: '',
    partnerContactPhone: '',
    partnerAddress: '',
    duration: '',
    paymentTerms: '',
    scope: '',
    governingLaw: 'Germany',
    additionalInstructions: '',
  });

  // Load template on mount
  useEffect(() => {
    if (templateId) {
      const template = LEGAL_DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(template.type);
        setTemplateName(template.name);
        setFormData((prev) => ({
          ...prev,
          documentTitle: `${template.name} - [Partner Name]`,
          duration: template.defaultTerms.duration || '',
          paymentTerms: template.defaultTerms.paymentTerms || '',
          governingLaw: template.defaultTerms.governingLaw || 'Germany',
        }));
      }
    }
  }, [templateId]);

  const handleGenerate = async () => {
    if (!selectedTemplate || !ventureId) return;

    setIsGenerating(true);

    try {
      const response = await fetch(`/api/ventures/${ventureId}/legal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventureId,
          documentType: selectedTemplate,
          documentTitle: formData.documentTitle,
          partnerInfo: {
            companyName: formData.partnerCompanyName,
            contactName: formData.partnerContactName,
            contactEmail: formData.partnerContactEmail,
            contactPhone: formData.partnerContactPhone,
            address: formData.partnerAddress,
          },
          contractTerms: {
            duration: formData.duration,
            paymentTerms: formData.paymentTerms,
            scope: formData.scope,
            governingLaw: formData.governingLaw,
          },
          additionalInstructions: formData.additionalInstructions,
        }),
      });

      const data = await response.json();

      if (data.success && data.document) {
        setGeneratedContent(data.document.generatedContent);
        setSavedDocId(data.document.id);
      } else {
        alert('Generierung fehlgeschlagen: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Fehler beim Generieren des Vertrags');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndView = () => {
    if (savedDocId) {
      router.push(`/forge/${ventureId}/legal/contracts/${savedDocId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zum Legal Studio
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF9900]/10 flex items-center justify-center">
            <Scale className="w-6 h-6 text-[#FF9900]" />
          </div>
          <div>
            <h1 className="text-4xl font-instrument-serif text-white mb-2">
              Vertrag generieren
            </h1>
            <p className="text-white/40 text-sm">
              Fülle die Details aus und lass die KI dein Rechtsdokument erstellen
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Context Injector */}
      <LegalContextInjector 
        ventureId={ventureId} 
        templateName={templateName}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="glass-card p-6 rounded-xl border border-white/10 space-y-6">
          <h2 className="text-xl font-instrument-serif text-white">
            Vertragsdetails
          </h2>

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Dokumententitel *
            </label>
            <input
              type="text"
              value={formData.documentTitle}
              onChange={(e) =>
                setFormData({ ...formData, documentTitle: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
              placeholder="z.B. NDA mit Lieferant XYZ"
            />
          </div>

          {/* Partner Info */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-widest">
              Partnerinformationen
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={formData.partnerCompanyName}
                  onChange={(e) =>
                    setFormData({ ...formData, partnerCompanyName: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Kontaktperson *
                  </label>
                  <input
                    type="text"
                    value={formData.partnerContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, partnerContactName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={formData.partnerContactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, partnerContactEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Adresse
                </label>
                <textarea
                  value={formData.partnerAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, partnerAddress: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contract Terms */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-widest">
              Vertragsbedingungen
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Laufzeit
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
                    placeholder="z.B. 12 Monate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Zahlungsbedingungen
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentTerms: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none"
                    placeholder="z.B. Zahlbar in 30 Tagen"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Umfang / Dienstleistungen
                </label>
                <textarea
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({ ...formData, scope: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none resize-none"
                  placeholder="Beschreibe die Arbeit, Dienstleistungen oder Ergebnisse..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Zusätzliche Anweisungen (für die KI)
                </label>
                <textarea
                  value={formData.additionalInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalInstructions: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#FF9900] focus:outline-none resize-none"
                  placeholder="z.B. Wettbewerbsverbot einschließen..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Generator */}
        <div className="space-y-4">
          <AIGenerator
            onGenerate={async () => {
              await handleGenerate();
              return generatedContent;
            }}
            isGenerating={isGenerating}
            generatedContent={generatedContent}
            brandContext={{
              brandName: 'Deine Marke',
              toneOfVoice: 'Professionell',
            }}
            buttonText="Vertrag mit KI generieren"
          />

          {/* Actions */}
          {generatedContent && (
            <div className="flex items-center gap-3">
              <DocumentExport
                content={generatedContent}
                filename={formData.documentTitle || 'contract'}
                format="txt"
              />

              <button
                onClick={handleSaveAndView}
                disabled={!savedDocId}
                className="flex-1 px-6 py-3 rounded-xl bg-[#FF9900] text-black font-bold hover:bg-[#FF9900] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Dokument anzeigen
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
