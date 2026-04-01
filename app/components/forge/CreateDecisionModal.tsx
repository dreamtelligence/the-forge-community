'use client';

import { useState } from 'react';
import { X, Gavel, Plus, Trash2, Clock, Calendar } from 'lucide-react';

interface CreateDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ventureId: string;
}

export function CreateDecisionModal({ isOpen, onClose, onSuccess, ventureId }: CreateDecisionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    type: 'MULTIPLE_CHOICE',
    options: ['', ''],
    deadline: '',
  });

  if (!isOpen) return null;

  const handleAddOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.type === 'MULTIPLE_CHOICE' && formData.options.filter(o => o.trim()).length < 2) {
      alert('Bitte gib mindestens 2 Optionen an.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/ventures/${ventureId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          options: formData.options.filter(o => o.trim()), // Clean empty options
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
            question: '',
            description: '',
            type: 'MULTIPLE_CHOICE',
            options: ['', ''],
            deadline: '',
        });
      } else {
        const data = await res.json();
        alert('Fehler: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create decision', error);
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
              <Gavel className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-instrument-serif text-white">Neue Abstimmung</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold hidden sm:block">Squad Entscheidung treffen</p>
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
          
          {/* Question & Description */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1 font-bold uppercase tracking-wide">Frage / Thema *</label>
              <input
                required
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="z.B. Welches Logo sollen wir verwenden?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1 font-bold uppercase tracking-wide">Beschreibung</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Zusätzliche Informationen..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none resize-none"
              />
            </div>
          </div>

          {/* Type & Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1 font-bold uppercase tracking-wide">Typ</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none appearance-none"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="YES_NO">Ja / Nein</option>
                {/* Ranking not implemented in UI yet */}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/60 ml-1 font-bold uppercase tracking-wide flex items-center gap-2">
                 <Calendar className="w-3 h-3" /> Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF9900] outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Options (Dynamic) */}
          {formData.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-3">
               <label className="text-xs text-white/60 ml-1 font-bold uppercase tracking-wide">Antwortmöglichkeiten</label>
               {formData.options.map((option, index) => (
                 <div key={index} className="flex gap-2">
                   <input
                     type="text"
                     value={option}
                     onChange={(e) => handleOptionChange(index, e.target.value)}
                     placeholder={`Option ${index + 1}`}
                     className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-[#FF9900] outline-none"
                   />
                   {formData.options.length > 2 && (
                     <button
                       type="button"
                       onClick={() => handleRemoveOption(index)}
                       className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               ))}
               <button
                 type="button"
                 onClick={handleAddOption}
                 className="flex items-center gap-2 text-sm text-[#FF9900] hover:underline px-2"
               >
                 <Plus className="w-4 h-4" /> Option hinzufügen
               </button>
            </div>
          )}
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
            Abstimmung Starten
          </button>
        </div>
      </div>
    </div>
  );
}
