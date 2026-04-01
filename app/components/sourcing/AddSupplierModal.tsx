'use client';

import { useState } from 'react';
import { X, Factory, Globe, Mail, Phone, ExternalLink, Hash, Clock, CreditCard, Star } from 'lucide-react';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ventureId: string;
}

export function AddSupplierModal({ isOpen, onClose, onSuccess, ventureId }: AddSupplierModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    country: '',
    category: 'manufacturer',
    specialization: '',
    moq: '',
    leadTimeDays: '',
    paymentTerms: '',
    notes: '',
    rating: 3,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          moq: formData.moq ? parseInt(formData.moq) : null,
          leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : null,
          rating: parseInt(formData.rating.toString()),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert('Fehler: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create supplier', error);
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl border border-white/10 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
              <Factory className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Neuer Lieferant</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold hidden sm:block">Stammdaten erfassen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex-shrink-0 p-2 sm:p-2.5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors active:scale-95"
            aria-label="Modal schließen"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto modal-scroll-container custom-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest border-l-2 border-[#FF9900] pl-3">Allgemeine Infos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1">Firmenname *</label>
                <input
                  required
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="z.B. Textile Pro Solutions"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1">Ansprechpartner</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1">Kategorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none appearance-none"
                >
                  <option value="fabric">Stoff / Material</option>
                  <option value="manufacturer">Produzent / Fabrik</option>
                  <option value="packaging">Verpackung</option>
                  <option value="logistics">Logistik</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-white/60 ml-1">Spezialisierung</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="z.B. Bio-Baumwolle, Siebdruck"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest border-l-2 border-[#FF9900] pl-3">Kontakt & Standort</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="E-Mail Adresse"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Telefonnummer"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="Website URL"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Land (z.B. Portugal, China)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest border-l-2 border-[#FF9900] pl-3">Konditionen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> MOQ
                </label>
                <input
                  type="number"
                  value={formData.moq}
                  onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                  placeholder="Mindestmenge"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Lead Time (Tage)
                </label>
                <input
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                  placeholder="z.B. 45"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Zahlung
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="z.B. 50/50"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes & Rating */}
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest border-l-2 border-[#FF9900] pl-3">Bewertung & Notizen</h3>
                <div className="flex gap-1 sm:gap-2">
                   {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className={`p-1 transition-colors ${formData.rating >= star ? 'text-yellow-500' : 'text-white/10'}`}
                      >
                         <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${formData.rating >= star ? 'fill-current' : ''}`} />
                      </button>
                   ))}
                </div>
             </div>
             <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Zusätzliche Notizen zum Lieferanten..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:border-[#FF9900] outline-none resize-none"
             />
          </div>
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 bg-black/40 backdrop-blur-md rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-white/60 hover:text-white transition-colors active:scale-95"
          >
            Abbrechen
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            type="button"
            className="px-8 py-3 bg-[#FF9900] text-black font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Clock className="w-4 h-4 animate-spin" />}
            Lieferant Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
