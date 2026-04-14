'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, User, Rocket, Zap, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OnboardingWizardProps {
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
    phone?: string | null;
    birthday?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressZip?: string | null;
    addressCountry?: string | null;
  };
  onComplete: () => void;
}

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [birthday, setBirthday] = useState(user.birthday || '');
  const [addressStreet, setAddressStreet] = useState(user.addressStreet || '');
  const [addressCity, setAddressCity] = useState(user.addressCity || '');
  const [addressZip, setAddressZip] = useState(user.addressZip || '');
  const [addressCountry, setAddressCountry] = useState(user.addressCountry || 'Germany');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const totalSteps = 5;
  const contactComplete = Boolean(
    name.trim() &&
    phone.trim() &&
    birthday.trim() &&
    addressStreet.trim() &&
    addressCity.trim() &&
    addressZip.trim() &&
    addressCountry.trim()
  );

  const handleNext = () => setStep(prev => prev + 1);

  const handleComplete = async () => {
    if (!contactComplete) {
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      // Update user profile and set onboardingComplete = true
      const res = await fetch('/api/me/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name,
          phone,
          birthday,
          address_street: addressStreet,
          address_city: addressCity,
          address_zip: addressZip,
          address_country: addressCountry,
          onboardingComplete: true,
        })
      });

      if (res.ok) {
        onComplete();
        router.refresh();
      }
    } catch (err) {
      console.error('Onboarding failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-8 touch-pan-y overscroll-none">
      <div className="w-full max-w-2xl bg-[#0B0C0E] border border-white/10 rounded-3xl shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-10 rounded-t-3xl overflow-hidden">
          <motion.div
            className="h-full bg-[#FF9900]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto modal-scroll-container custom-scrollbar p-6 sm:p-8 md:p-12 pt-8 sm:pt-10 md:pt-14">
          <div className="min-h-full flex flex-col justify-center">
            <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6 sm:space-y-8 py-4"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FF9900]/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF9900]" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-instrument-serif text-white">Willkommen in der Forge.</h2>
                <p className="text-base sm:text-lg text-white/50 max-w-md mx-auto px-4">
                  Du bist jetzt Teil eines elitären Netzwerks. Hier bauen wir keine Spielzeuge, sondern skalierbare Assets.
                </p>
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto px-8 py-4 bg-[#FF9900] text-black font-bold rounded-xl hover:bg-[#FF9900] active:scale-95 transition-all"
                >
                  System Initialisieren
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6 sm:space-y-8 py-4"
              >
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-instrument-serif text-white mb-2">Identität Bestätigen</h3>
                  <p className="text-sm sm:text-base text-white/50">Wie sollen wir dich im Netzwerk nennen?</p>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                        placeholder="Dein Name"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-4 sm:pt-8">
                  <button
                    onClick={handleNext}
                    disabled={!name.trim()}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6 sm:space-y-8 py-2"
              >
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-instrument-serif text-white mb-2">Kontakt & Adresse</h3>
                  <p className="text-sm sm:text-base text-white/50">Pflichtdaten, damit wir dich sauber im System führen.</p>
                </div>

                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Telefon *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                      placeholder="+49..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Geburtstag *</label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Straße & Nr. *</label>
                    <input
                      type="text"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                      placeholder="Musterstraße 12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">PLZ *</label>
                    <input
                      type="text"
                      value={addressZip}
                      onChange={(e) => setAddressZip(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                      placeholder="10115"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Stadt *</label>
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                      placeholder="Berlin"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Land *</label>
                    <input
                      type="text"
                      value={addressCountry}
                      onChange={(e) => setAddressCountry(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:border-[#FF9900] outline-none transition-colors"
                      placeholder="Germany"
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-2 sm:pt-4 pb-2">
                  <button
                    onClick={handleNext}
                    disabled={!contactComplete}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6 sm:space-y-8 py-4"
              >
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-2xl sm:text-3xl font-instrument-serif text-white mb-2">Dein Arsenal</h3>
                  <p className="text-sm sm:text-base text-white/50">Du hast Zugriff auf Enterprise-Grade Tools.</p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-5 sm:p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400 mb-3 sm:mb-4" />
                    <h4 className="text-white font-bold mb-2 text-sm sm:text-base">Admin Shield</h4>
                    <p className="text-xs text-white/50">Automatisierte Verträge & Rechtssicherheit.</p>
                  </div>
                  <div className="p-5 sm:p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-[#FF9900] mb-3 sm:mb-4" />
                    <h4 className="text-white font-bold mb-2 text-sm sm:text-base">Orion AI</h4>
                    <p className="text-xs text-white/50">Dein 24/7 Co-Founder für Strategie & Ops.</p>
                  </div>
                  <div className="p-5 sm:p-6 bg-white/5 border border-white/10 rounded-2xl sm:col-span-2 md:col-span-1">
                    <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400 mb-3 sm:mb-4" />
                    <h4 className="text-white font-bold mb-2 text-sm sm:text-base">Launch Pad</h4>
                    <p className="text-xs text-white/50">Deployment & Skalierungsinfrastruktur.</p>
                  </div>
                </div>

                <div className="flex justify-center pt-4 sm:pt-8">
                  <button
                    onClick={handleNext}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all"
                  >
                    Alles Klar
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 sm:space-y-8 py-4"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-green-500/20">
                  <Check className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-instrument-serif text-white">Ready to Forge.</h2>
                <p className="text-base sm:text-lg text-white/50 max-w-md mx-auto px-4">
                  Dein Forum ist bereit. Starte deine erste Mission oder schließe dich einem Squad an.
                </p>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-[#FF9900] text-black font-bold rounded-xl hover:bg-[#FF9900] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Lade Forum...' : 'Zum Forum'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
