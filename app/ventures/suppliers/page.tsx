'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/app/components/AuthGuard';
import PageShell from '@/app/components/PageShell';
import { Search, Package, MapPin, ExternalLink, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch('/api/resources');
        if (res.ok) {
          const data = await res.json();
          const nextSuppliers = Array.isArray(data) ? data : data?.resources;
          setSuppliers(Array.isArray(nextSuppliers) ? nextSuppliers : []);
        }
      } catch (error) {
        console.error('Failed to fetch suppliers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSuppliers();
  }, []);

  const allCategories = ['All', ...new Set(suppliers.map(s => s.type || s.category))].sort();

  const filteredSuppliers = suppliers.filter(supplier => {
    const searchFields = [
      supplier.title,
      supplier.description,
      supplier.location,
      supplier.type,
      supplier.category
    ].filter(Boolean).map(f => f.toLowerCase());

    const matchesSearch = searchQuery === '' || searchFields.some(f => f.includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' ||
      supplier.type === selectedCategory ||
      supplier.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <AuthGuard>
      <PageShell>
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-instrument-serif text-white tracking-tight mb-4">
                B2B Supplier Directory
              </h1>
              <p className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">
                Geprüfte Großhändler & Hersteller für dein E-Commerce Venture
              </p>
            </div>
            <Link
              href="/ventures"
              className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-[#FF9900] transition-colors"
            >
              ← Zurück zu Ventures
            </Link>
          </div>
        </header>

        {/* Search */}
        <div className="mb-8">
          <div className="relative mb-6">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Suppliern, Locations, Produkten..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-14 pr-6 py-4 text-sm text-white focus:border-[#FF9900] focus:ring-0 outline-none transition-all placeholder:text-white/20"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#FF9900] text-black'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin mb-4" />
            <p className="text-white/30 text-sm uppercase tracking-widest">Lade Datenbank...</p>
          </div>
        ) : (
          /* Suppliers Grid */
          <div className="grid md:grid-cols-2 gap-6">
            {filteredSuppliers.map((supplier) => (
              <a
                key={supplier.id}
                href={supplier.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-2xl border border-white/10 p-8 hover:border-[#FF9900]/40 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-instrument-serif text-white mb-2 group-hover:text-[#FF9900] transition-colors flex items-center gap-2">
                      {supplier.title}
                      {supplier.isPublic && (
                        <span className="text-xs text-green-500">✓</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <MapPin className="w-3 h-3" />
                      {supplier.location || 'Global'}
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/20 group-hover:text-[#FF9900] transition-colors" />
                </div>

                {/* Description */}
                <p className="text-sm text-white/60 mb-6 leading-relaxed">
                  {supplier.description}
                </p>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {supplier.type && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 text-white/40">
                      {supplier.type}
                    </span>
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#FF9900]/10 text-[#FF9900]/60 border border-[#FF9900]/20">
                    {supplier.category}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                      Kontakt
                    </div>
                    <div className="text-[10px] text-white/60 truncate">
                      {supplier.contactInfo?.email || supplier.contactEmail || 'Anfrage über Web'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                      Telefon
                    </div>
                    <div className="text-xs text-white/60">
                      {supplier.contactInfo?.phone || '-'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                      Adresse
                    </div>
                    <div className="text-[10px] text-white/40 italic">
                      {supplier.contactInfo?.address || 'Siehe Website'}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && filteredSuppliers.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30">Keine Supplier gefunden</p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 glass-card rounded-2xl border border-[#FF9900]/20 p-8 bg-[#FF9900]/5">
          <h3 className="text-xl font-instrument-serif text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#FF9900]" />
            Pro-Tipps für B2B Sourcing
          </h3>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-[#FF9900] mt-1">•</span>
              <span><strong className="text-white">Samples zuerst:</strong> Bestelle immer Muster bevor du große Orders machst.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#FF9900] mt-1">•</span>
              <span><strong className="text-white">Vergleiche 3+ Supplier:</strong> Preise und Qualität variieren massiv.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#FF9900] mt-1">•</span>
              <span><strong className="text-white">Payment Terms verhandeln:</strong> Bei größeren Orders sind 30-50% Deposit möglich.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#FF9900] mt-1">•</span>
              <span><strong className="text-white">Stake & Scale Hub:</strong> Nutze unser Verzeichnis, um verifizierte Partner zu finden.</span>
            </li>
          </ul>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
