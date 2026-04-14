'use client';

import { useState, useEffect } from 'react';
import { X, Package, Clock, AlertCircle } from 'lucide-react';

interface AddSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ventureId: string;
}

export function AddSampleModal({ isOpen, onClose, onSuccess, ventureId }: AddSampleModalProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    productName: '',
    description: '',
    quantity: '1',
    cost: '',
    currency: 'EUR',
    status: 'REQUESTED',
    orderedAt: new Date().toISOString().split('T')[0],
    imageUrl: '',
    specFileUrl: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/ventures/${ventureId}/sourcing/suppliers`)
        .then(res => res.json())
        .then(data => {
          setSuppliers(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, supplierId: data[0].id }));
          }
        });
    }
  }, [isOpen, ventureId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert('Bitte wähle einen Lieferanten aus.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          orderedAt: formData.orderedAt ? new Date(formData.orderedAt) : null,
          imageUrls: formData.imageUrl ? [formData.imageUrl] : [],
          specFileUrls: formData.specFileUrl ? [formData.specFileUrl] : [],
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
      console.error('Failed to create sample', error);
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] rounded-2xl border border-white/10 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Sample anfordern</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold hidden sm:block">Musterbestellung tracken</p>
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
          <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Lieferant *</label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none appearance-none"
              >
                <option value="" disabled>Lieferant wählen...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-[10px] text-yellow-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Zuerst einen Lieferanten anlegen!
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Produktname *</label>
              <input
                required
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="z.B. Bio-Cotton T-Shirt V1"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs text-white/60 ml-1">Anzahl</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-white/60 ml-1">Kosten ({formData.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                  />
               </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Anforderungsdatum</label>
              <input
                type="date"
                value={formData.orderedAt}
                onChange={(e) => setFormData({ ...formData, orderedAt: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Notizen / Spezifikationen</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details zum Muster..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs text-white/60 ml-1">Bild URL</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:border-[#FF9900] outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-white/60 ml-1">Tech Pack / PDF URL</label>
                  <input
                    type="text"
                    value={formData.specFileUrl}
                    onChange={(e) => setFormData({ ...formData, specFileUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:border-[#FF9900] outline-none"
                  />
               </div>
            </div>
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
            disabled={loading || !formData.supplierId}
            onClick={handleSubmit}
            type="button"
            className="px-8 py-3 bg-[#FF9900] text-black font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Clock className="w-4 h-4 animate-spin" />}
            Anfrage Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
