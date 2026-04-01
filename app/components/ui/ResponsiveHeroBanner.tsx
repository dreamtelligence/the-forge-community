import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { X, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SeamlessVideoLoop from './SeamlessVideoLoop';
import BetaLoginButton from '@/app/components/ui/BetaLoginButton';

interface NavLink {
    label: string;
    href: string;
    isActive?: boolean;
}

interface Partner {
    logoUrl: string;
    href: string;
    scale?: number;
}

interface ResponsiveHeroBannerProps {
    logoUrl?: string;
    backgroundImageUrl?: string;
    backgroundVideoUrl?: string;
    backgroundVideoUrlMobile?: string;
    navLinks?: NavLink[];
    ctaButtonText?: string;
    ctaButtonHref?: string;
    badgeText?: string;
    badgeLabel?: string;
    title?: string;
    titleLine2?: string;
    description?: string;
    primaryButtonText?: string;
    primaryButtonHref?: string;
    secondaryButtonText?: string;
    secondaryButtonHref?: string;
    partnersTitle?: string;
    partners?: Partner[];
}

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
    backgroundImageUrl,
    backgroundVideoUrl,
    backgroundVideoUrlMobile,
    navLinks = [
        { label: "Home", href: "/", isActive: true },
        { label: "Forum", href: "/forum" },
        { label: "Squads", href: "/squads" },
        { label: "Impressum", href: "/legal/impressum" }
    ],
    badgeText = "Beta ist gestartet",
    title = "Hör auf, alleine",
    titleLine2 = "zu kämpfen.",
    description = "Warum 100k riskieren, wenn du mit 50 Experten ein profitables Imperium schmieden kannst? Wir bündeln Kapital, Skills und Execution. Echte Brands. Echte Anteile.",
    primaryButtonText = "JETZT STARTEN",
    primaryButtonHref = "#apply",
    secondaryButtonText = "MEHR ERFAHREN",
    secondaryButtonHref = "#",
    partnersTitle = "Unterstützt durch führende Technologien",
    partners = [
        { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Vercel_logo_black.svg", href: "https://vercel.com", scale: 1.2 },
        { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg", href: "https://stripe.com" },
        { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Nextjs-logo.svg", href: "https://nextjs.org" },
        { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg", href: "https://tailwindcss.com" },
        { logoUrl: "https://simpleicons.org/icons/prisma.svg", href: "https://prisma.io" }
    ]
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { status } = useSession();
    
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 1000], [0, 300]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <section className="w-full isolate min-h-screen overflow-hidden relative">
            {backgroundVideoUrl ? (
                <>
                    {/* Mobile Video with Seamless Loop */}
                    <motion.div style={{ y }} className="md:hidden absolute inset-0 z-0 bg-black">
                        <SeamlessVideoLoop
                            src={backgroundVideoUrlMobile ?? backgroundVideoUrl}
                            className="object-cover"
                            objectPosition="center 30%"
                            crossfadeAt={2.0}
                            fadeDuration={1.0}
                            isPlaying={isMobile}
                        />
                    </motion.div>

                    {/* Desktop Video with Seamless Loop */}
                    <motion.div style={{ y }} className="hidden md:block absolute inset-0 z-0 bg-black">
                        <SeamlessVideoLoop
                            src={backgroundVideoUrl}
                            className="object-cover"
                            objectPosition="center"
                            crossfadeAt={1.5}
                            fadeDuration={0.8}
                            isPlaying={!isMobile}
                        />
                    </motion.div>
                </>
            ) : backgroundImageUrl ? (
                <img
                    src={backgroundImageUrl}
                    alt=""
                    className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0 z-0"
                />
            ) : null}
            
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/60 via-black/35 to-black/70 z-1" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 z-10" />

            <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none select-none z-2 overflow-hidden translate-y-64 sm:translate-y-72 md:translate-y-80">
                <h1
                    className="px-2 sm:px-6 md:px-10 text-[13vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] font-black tracking-tight opacity-[0.14] leading-[0.9] text-center whitespace-nowrap"
                    style={{
                        WebkitTextStroke: '1.5px rgba(255,255,255,0.35)',
                        color: 'transparent',
                        fontFamily: 'var(--font-instrument-serif), serif',
                        filter: 'blur(0.4px)'
                    }}
                >
                    Stake & Scale
                </h1>
            </div>

            <header className="z-20 xl:top-4 relative">
                <div className="mx-6">
                    <div className="relative flex items-center justify-between pt-4">
                        <Link href="/" className="flex items-center gap-3 group">
                          <img
                            src="/Logo.JPEG"
                            alt="STAKE & SCALE"
                            className="h-10 w-10 rounded-full shadow-[0_0_24px_rgba(0,0,0,0.4)]"
                          />
                        </Link>

                        <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-10rem)] justify-center">
                            <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur">
                                {navLinks?.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.href}
                                        className={`px-3 py-2 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors ${link.isActive ? 'text-white' : 'text-white/60'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                {status === 'authenticated' ? (
                                    <Link
                                        href="/forum"
                                        className="ml-1 inline-flex items-center gap-2 rounded-full bg-(--accent) px-4 py-2 text-[10px] font-black text-black hover:brightness-110 transition-all uppercase tracking-[0.2em]"
                                    >
                                        Forum
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                ) : (
                                    <BetaLoginButton
                                        label="Login"
                                        className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black text-black uppercase tracking-[0.2em]"
                                    />
                                )}
                            </div>
                        </nav>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur"
                            aria-expanded={mobileMenuOpen}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5 text-white" /> : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white/90">
                                    <path d="M4 5h16" />
                                    <path d="M4 12h16" />
                                    <path d="M4 19h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-20 left-6 right-6 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:hidden animate-fade-in z-50">
                        <nav className="flex flex-col gap-4">
                            {navLinks?.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {status === 'authenticated' ? (
                                <Link
                                    href="/forum"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full py-4 bg-(--accent) text-black rounded-xl text-center font-black uppercase tracking-[0.2em] text-[10px] mt-2"
                                >
                                    ZUM FORUM
                                </Link>
                            ) : (
                                <BetaLoginButton
                                    label="LOGIN"
                                    onClick={() => setMobileMenuOpen(false)}
                                    wrapperClassName="w-full mt-2"
                                    className="w-full py-4 bg-(--accent) text-black rounded-xl text-center font-black uppercase tracking-[0.2em] text-[10px] inline-flex items-center justify-center gap-2"
                                />
                            )}
                        </nav>
                    </div>
                )}
            </header>

            <div className="z-10 relative">
                <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-32 max-w-7xl mx-auto px-4 pb-48">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 backdrop-blur animate-fade-slide-in-1">
                            <span className="text-[10px] sm:text-xs font-bold text-white/90 uppercase tracking-[0.2em]">
                                {badgeText}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight text-white tracking-tight font-instrument-serif font-normal animate-fade-slide-in-2 px-4 sm:px-0">
                            {title}
                            <br className="hidden sm:block" />
                            {" "}{titleLine2}
                        </h1>

                        {description ? (
                            <p className="text-base sm:text-lg md:text-xl animate-fade-slide-in-3 text-white/60 max-w-xl mt-6 mx-auto leading-relaxed px-4 sm:px-0 text-left sm:text-center">
                                {description}
                            </p>
                        ) : null}

                        <div className="flex flex-col sm:flex-row sm:gap-4 mt-10 gap-4 items-center justify-center animate-fade-slide-in-4 px-4 sm:px-0">
                            <Link
                                href={primaryButtonHref}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#FF9900] text-black hover:brightness-110 text-[10px] font-black rounded-xl py-4 px-8 uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl shadow-[#FF9900]/20"
                            >
                                {primaryButtonText}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={secondaryButtonHref}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl bg-white/5 border border-white/10 px-8 py-4 text-[10px] font-black text-white hover:bg-white/10 uppercase tracking-[0.3em] transition-all duration-500"
                            >
                                {secondaryButtonText}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                                </svg>
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center pointer-events-none select-none sm:hidden" aria-hidden="true">
                            <h2
                                className="px-2 text-[14vw] font-black tracking-tight opacity-[0.14] leading-[0.9] text-center whitespace-nowrap"
                                style={{
                                    WebkitTextStroke: '1.5px rgba(255,255,255,0.35)',
                                    color: 'transparent',
                                    fontFamily: 'var(--font-instrument-serif), serif',
                                    filter: 'blur(0.4px)'
                                }}
                            >
                                Stake & Scale
                            </h2>
                        </div>
                    </div>

                </div>
            </div>
            <div className="absolute inset-x-0 bottom-2 z-20 pointer-events-none select-none">
                <div className="mx-auto max-w-5xl px-4">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative overflow-hidden animate-fade-slide-in-2">
                            <div className="partner-marquee-track flex items-center gap-x-12 sm:gap-x-16">
                                <div className="flex items-center gap-x-12 sm:gap-x-16 partner-marquee-group">
                                    {partners.map((partner, index) => (
                                        <div
                                            key={`${partner.logoUrl}-${index}`}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <div
                                                className="w-12 h-12 bg-center bg-contain bg-no-repeat brightness-0 invert opacity-50 grayscale pointer-events-none"
                                                style={{
                                                    backgroundImage: `url(${partner.logoUrl})`,
                                                    transform: `scale(${partner.scale || 1})`
                                                }}
                                                aria-label={`Partner logo ${index + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-x-12 sm:gap-x-16 partner-marquee-group" aria-hidden="true">
                                    {partners.map((partner, index) => (
                                        <div
                                            key={`${partner.logoUrl}-${index}-dup`}
                                            className="flex items-center justify-center shrink-0"
                                        >
                                            <div
                                                className="w-12 h-12 bg-center bg-contain bg-no-repeat brightness-0 invert opacity-50 grayscale pointer-events-none"
                                                style={{
                                                    backgroundImage: `url(${partner.logoUrl})`,
                                                    transform: `scale(${partner.scale || 1})`
                                                }}
                                                aria-label={`Partner logo ${index + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="animate-fade-slide-in-1 text-[8px] font-black uppercase tracking-[0.5em] text-white/20 text-center">
                            {partnersTitle}
                        </p>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes partner-marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                .partner-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: partner-marquee 40s linear infinite;
                    will-change: transform;
                }

                .partner-marquee-group {
                    flex-shrink: 0;
                }
            `}</style>
        </section>
    );
};

export default ResponsiveHeroBanner;
