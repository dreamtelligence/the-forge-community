'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle, ArrowRight } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/') {
      router.replace('/');
    }

    if (status === 'authenticated') {
      // Check profile completeness
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          if (data?.accountStatus === 'DELETED') {
            signOut({ callbackUrl: '/login?deleted=1' });
            return;
          }
          setProfileComplete(data.isProfileComplete);
        })
        .catch(() => setProfileComplete(true)); // Fallback to safe state
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[0.7rem] uppercase tracking-[0.3em] text-white/40 animate-pulse">
          Authentifiziere...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <>
      {children}

      {/* Profile Completion Overlay */}
      <AnimatePresence>
        {profileComplete === false && pathname !== '/profile' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-[#FF9900]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <UserCircle className="w-10 h-10 text-[#FF9900]" />
              </div>
              <h2 className="text-3xl font-instrument-serif text-white mb-4">Willkommen bei The Forge!</h2>
              <p className="text-white/50 font-medium mb-8 leading-relaxed">
                Um die Community sicher und exklusiv zu halten, bitten wir dich, dein **Founder Dossier** (Adresse, Kontakt, Skills) einmalig zu vervollständigen.
              </p>
              <button 
                onClick={() => router.push('/profile')}
                className="w-full bg-[#FF9900] text-black py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
              >
                Profil vervollständigen <ArrowRight className="w-4 h-4" />
              </button>
              <p className="mt-6 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                Dauert weniger als 2 Minuten
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
