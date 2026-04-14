'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Clock } from 'lucide-react';
import { useAIContext } from '@/app/context/AIContext';

interface AddCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ventureId: string;
}

export function AddCampaignModal({ isOpen, onClose, onSuccess, ventureId }: AddCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const { setContext } = useAIContext();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal: 'awareness',
    startDate: '',
    endDate: '',
    budgetAmount: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    if (isOpen) {
      setContext('Erstelle neue Marketing Kampagne. Hilf dem User bei Zielen, Budget und Zeitplanung.');
      // Optional: Auto-open sidebar
      // setSidebarOpen(true);
    } else {
      setContext('Marketing Studio');
    }
  }, [isOpen, setContext]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/ventures/${ventureId}/marketing/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert('Fehler: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create campaign', error);
      alert('Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl border border-white/10 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Neue Kampagne</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold hidden sm:block">Marketing-Planung</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto modal-scroll-container custom-scrollbar">
          <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-xs text-white/60 ml-1">Kampagnen-Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Produktlaunch Q1"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Ziel</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none appearance-none"
              >
                <option value="awareness">Brand Awareness</option>
                <option value="conversion">Sales / Conversion</option>
                <option value="engagement">Engagement</option>
                <option value="retention">Kundenbindung</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1">Budget (EUR)</label>
              <input
                type="number"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1">Startdatum</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs text-white/60 ml-1">Enddatum</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
                />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/60 ml-1">Beschreibung</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Worum geht es in dieser Kampagne?"
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
            Kampagne Erstellen
          </button>
        </div>
      </div>
    </div>
  );
}
