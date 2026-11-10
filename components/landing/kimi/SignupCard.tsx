'use client';

import { useI18n } from '@/components/i18n/I18nProvider';

export default function SignupCard() {
  const { copy, locale } = useI18n();
  const english = locale === 'en';

  return (
    <div className="flex flex-col md:flex-row w-full bg-[#0C0E10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[460px]">
      <div className="flex-1 relative overflow-hidden min-h-[340px] md:min-h-0 bg-black group">
        <img
          src="/galaxy_astronaut.webp"
          alt="Stake & Scale concept art"
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-all duration-700 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 flex items-end p-8 sm:p-10 pointer-events-none">
          <div className="max-w-lg text-white">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              {copy?.signup?.leftTitleLines?.join(' ') || 'STAKE & SCALE'}
            </h2>
            <p className="text-white/80 text-base leading-relaxed">{copy?.signup?.leftBody}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center md:border-l border-white/10 bg-black/40">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40 mb-6">
          {english ? 'Archived design showcase' : 'Archivierte Designstudie'}
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-5">
          Stake &amp; Scale
        </h2>
        <p className="text-white/60 text-base leading-relaxed mb-8">
          {english
            ? 'The original platform is no longer active. This page remains online to showcase the interface, animations and design work. Registration, login and paid services are disabled.'
            : 'Die ursprüngliche Plattform wurde eingestellt. Diese Seite zeigt weiterhin das Interface, die Animationen und die Designarbeit. Registrierung, Login und kostenpflichtige Dienste sind deaktiviert.'}
        </p>
        <a
          href="https://github.com/dreamtelligence/the-forge-community"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex self-start items-center justify-center rounded-full border border-white/20 px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-white hover:bg-white hover:text-black transition-colors"
        >
          {english ? 'View source on GitHub' : 'Quellcode auf GitHub ansehen'}
        </a>
      </div>
    </div>
  );
}
