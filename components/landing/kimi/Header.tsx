'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import CtaButton from '@/components/landing/kimi/CtaButton';
import { useI18n } from '@/components/i18n/I18nProvider';
import BetaLoginButton from '@/components/ui/BetaLoginButton';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { copy, link, locale } = useI18n();
  const navLinks = (copy.header.nav as Array<{ label: string; href: string }>).filter(item => item.href !== '#pricing');
  const toggleHref = locale === 'en' ? '/' : '/en';
  const toggleLabel = copy.header.languageToggle.label as string;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking a link
  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <Link href="#hero" className="text-white font-semibold text-lg tracking-tight z-50">
            {copy.header.brand}
          </Link>

          {/* Desktop Navigation */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
            <nav className="flex items-center gap-8 pointer-events-auto">
              {navLinks.map((linkItem) => (
                <a
                  key={linkItem.label}
                  href={linkItem.href}
                  className="text-white/60 hover:text-white text-xs uppercase tracking-widest transition-colors duration-200"
                >
                  {linkItem.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={toggleHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Switch language"
            >
              {toggleLabel}
            </Link>
            <BetaLoginButton
              label={copy.header.cta.login}
              locale={locale}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all duration-300"
            />
            <CtaButton href={link('#start')} label={copy.header.cta.start} variant="primary" size="sm" />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10"
          >
            <nav className="px-6 py-6 space-y-6">
              {/* Navigation Links */}
              <div className="space-y-4">
                {navLinks.map((linkItem, index) => (
                  <motion.a
                    key={linkItem.label}
                    href={linkItem.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={handleLinkClick}
                    className="block text-white/80 hover:text-white text-sm uppercase tracking-widest transition-colors py-2"
                  >
                    {linkItem.label}
                  </motion.a>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href={toggleHref}
                  onClick={handleLinkClick}
                  className="flex items-center justify-center rounded-full border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  {toggleLabel}
                </Link>
                <BetaLoginButton
                  label={copy.header.cta.login}
                  locale={locale}
                  onClick={handleLinkClick}
                  wrapperClassName="w-full"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors"
                />
                <Link
                  href={link('#start')}
                  onClick={handleLinkClick}
                  className="flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all"
                >
                  {copy.header.cta.start}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
