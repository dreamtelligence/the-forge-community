"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  consented: boolean;
}

const COOKIE_CONSENT_KEY = "cookie-consent";

function getInitialConsent(): CookieConsent {
  if (typeof window === "undefined") {
    return {
      essential: true,
      analytics: false,
      marketing: false,
      consented: false,
    };
  }
  
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    essential: true,
    analytics: false,
    marketing: false,
    consented: false,
  };
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(getInitialConsent());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      setConsent(JSON.parse(stored));
    }
  }, []);

  const updateConsent = (newConsent: Partial<CookieConsent>) => {
    const updated = { ...consent, ...newConsent };
    setConsent(updated);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated));
    
    // Update GTM consent
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: updated.analytics ? "granted" : "denied",
        ad_storage: updated.marketing ? "granted" : "denied",
        ad_user_data: updated.marketing ? "granted" : "denied",
        ad_personalization: updated.marketing ? "granted" : "denied",
      });
    }
  };

  return { consent, updateConsent, isLoaded };
}

export function CookieBanner() {
  const { consent, updateConsent, isLoaded } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoaded && !consent.consented) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, consent.consented]);

  const handleAcceptAll = () => {
    updateConsent({
      essential: true,
      analytics: true,
      marketing: true,
      consented: true,
    });
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    updateConsent({
      ...consent,
      consented: true,
    });
    setIsVisible(false);
  };

  const handleDecline = () => {
    updateConsent({
      essential: true,
      analytics: false,
      marketing: false,
      consented: true,
    });
    setIsVisible(false);
  };

  if (!isVisible || !isLoaded) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
      <div 
        className={cn(
          "mx-auto max-w-4xl rounded-xl border border-white/10 bg-[#0F1113]/95 backdrop-blur-xl p-6 shadow-2xl",
          "animate-fade-in-up"
        )}
      >
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#FF9900" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                  <path d="M8.5 8.5v.01"/>
                  <path d="M16 15.5v.01"/>
                  <path d="M12 12v.01"/>
                  <path d="M11 17v.01"/>
                  <path d="M7 14v.01"/>
                </svg>
                Cookie-Einstellungen
              </h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Wir verwenden Cookies, um dir die bestmögliche Erfahrung zu bieten. 
                Essenzielle Cookies sind immer aktiv. Für Analytics und Marketing brauchen wir dein OK. 
                <Link 
                  href="/legal/datenschutz" 
                  className="text-[#FF9900] hover:underline ml-1"
                >
                  Mehr erfahren
                </Link>
              </p>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="space-y-3 border-t border-white/10 pt-4 animate-fade-in">
              {/* Essential */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-white">Essenzielle Cookies</p>
                  <p className="text-xs text-gray-500">Login, Sicherheit, grundlegende Funktionen</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#FF9900]">Immer aktiv</span>
                  <div className="w-11 h-6 bg-[#FF9900]/20 rounded-full flex items-center px-1">
                    <div className="w-4 h-4 bg-[#FF9900] rounded-full translate-x-5" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-white">Analytics</p>
                  <p className="text-xs text-gray-500">Google Analytics zur Nutzungsanalyse</p>
                </div>
                <button
                  onClick={() => updateConsent({ analytics: !consent.analytics })}
                  className={cn(
                    "w-11 h-6 rounded-full flex items-center px-1 transition-colors",
                    consent.analytics ? "bg-[#FF9900]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform",
                    consent.analytics ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-white">Marketing</p>
                  <p className="text-xs text-gray-500">Personalisierte Werbung & Tracking</p>
                </div>
                <button
                  onClick={() => updateConsent({ marketing: !consent.marketing })}
                  className={cn(
                    "w-11 h-6 rounded-full flex items-center px-1 transition-colors",
                    consent.marketing ? "bg-[#FF9900]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform",
                    consent.marketing ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <Button
              onClick={handleAcceptAll}
              className="bg-[#FF9900] text-black hover:bg-[#FF9900]/90 font-medium"
            >
              Alle akzeptieren
            </Button>
            
            {showDetails ? (
              <Button
                onClick={handleAcceptSelected}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Auswahl speichern
              </Button>
            ) : (
              <Button
                onClick={handleDecline}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Nur essenzielle
              </Button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-400 hover:text-white ml-auto transition-colors"
            >
              {showDetails ? "Weniger anzeigen" : "Einstellungen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
