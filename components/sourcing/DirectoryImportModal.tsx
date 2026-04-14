'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, Package, Mail, Globe, ArrowLeft, Filter, SortAsc, LayoutGrid, Check, Phone, TrendingUp } from 'lucide-react';

interface DirectoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  ventureId: string;
}

export function DirectoryImportModal({ isOpen, onClose, onImported, ventureId }: DirectoryImportModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [importingId, setImportingId] = useState<string | null>(null);
  
  // Advanced Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'location'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [availableFilters, setAvailableFilters] = useState<{types: string[], locations: string[]}>({ types: [], locations: [] });
  const [showFilters, setShowFilters] = useState(false);

  const LIMIT = 25;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prev => prev + LIMIT);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchResources = useCallback(async (currentOffset: number, query: string, isNewSearch = false) => {
    setLoading(true);
    try {
      const typeParams = selectedTypes.length > 0 ? `&types=${encodeURIComponent(selectedTypes.join(','))}` : '';
      const locParams = selectedLocations.length > 0 ? `&locations=${encodeURIComponent(selectedLocations.join(','))}` : '';
      const sortParams = `&sortBy=${sortBy}&order=${sortOrder}`;
      
      const url = `/api/resources?limit=${LIMIT}&offset=${currentOffset}${query ? `&search=${encodeURIComponent(query)}` : ''}${typeParams}${locParams}${sortParams}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.resources || [];
        const total = data.total || 0;
        
        setTotalCount(total);
        if (data.availableFilters) setAvailableFilters(data.availableFilters);

        setResources((prev) => {
          const next = isNewSearch ? newItems : [...prev, ...newItems];
          setHasMore(next.length < total);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, selectedLocations, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Trigger fetch on filter/sort change
  useEffect(() => {
    if (isOpen) {
      setResources([]);
      setOffset(0);
      setHasMore(true);
      fetchResources(0, debouncedQuery, true);
    }
  }, [selectedTypes, selectedLocations, sortBy, sortOrder, isOpen, fetchResources, debouncedQuery]);

  useEffect(() => {
    if (offset > 0 && isOpen) fetchResources(offset, debouncedQuery);
  }, [offset, isOpen, fetchResources, debouncedQuery]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);
  };

  async function handleImport(resourceId: string) {
    setImportingId(resourceId);
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId })
      });
      if (res.ok) {
        onImported();
        onClose();
      }
    } finally {
      setImportingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col z-[2147483647] overflow-hidden">
      {/* 1. SaaS HEADER */}
      <header className="flex-none min-h-[64px] sm:h-20 bg-black border-b border-white/10 px-4 sm:px-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 py-3 sm:py-0 shadow-2xl">
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-white" />
            <span className="text-xs font-black uppercase tracking-widest">Zurück</span>
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="truncate">Partner Netzwerk</span>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-[#FF9900]/20 text-[#FF9900] text-xs font-mono">{totalCount}</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 truncate">Global B2B Directory</span>
            </div>
          </div>
        </div>

        {/* Search Bar - Center */}
        <div className="flex-1 sm:max-w-xl sm:px-8">
          <div className="relative group">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#FF9900] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Partner oder Leistungen suchen..."
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 sm:pr-6 py-2.5 sm:py-3.5 text-sm text-white placeholder:text-white/10 focus:border-[#FF9900]/50 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Filter Toggle & Sorting */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button 
              onClick={() => { setSortBy('title'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${sortBy === 'title' ? 'bg-[#FF9900] text-black' : 'text-white/40 hover:text-white'}`}
            >
              <SortAsc className="w-3.5 h-3.5" /> A-Z
            </button>
            <button 
              onClick={() => { setSortBy('location'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${sortBy === 'location' ? 'bg-[#FF9900] text-black' : 'text-white/40 hover:text-white'}`}
            >
              <MapPin className="w-3.5 h-3.5" /> Stadt
            </button>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-xs font-black uppercase tracking-widest ${showFilters ? 'bg-[#FF9900] border-[#FF9900] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
          >
            <Filter className="w-4 h-4" />
            Filter {(selectedTypes.length + selectedLocations.length) > 0 && `(${(selectedTypes.length + selectedLocations.length)})`}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. FILTER SIDEBAR (Multi-Choice) */}
        {showFilters && (
          <aside className="w-80 flex-none bg-black border-r border-white/10 overflow-y-auto custom-scrollbar p-8 space-y-10 animate-in slide-in-from-left duration-300">
            {/* Types / Categories */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> Branche / Art
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableFilters.types.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedTypes.includes(type) ? 'bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900]' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Standort
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {availableFilters.locations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => toggleLocation(loc)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all text-left group"
                  >
                    <span className={`text-[11px] font-bold transition-colors ${selectedLocations.includes(loc) ? 'text-[#FF9900]' : 'text-white/40 group-hover:text-white'}`}>{loc}</span>
                    {selectedLocations.includes(loc) && <Check className="w-3.5 h-3.5 text-[#FF9900]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {(selectedTypes.length > 0 || selectedLocations.length > 0) && (
              <button 
                onClick={() => { setSelectedTypes([]); setSelectedLocations([]); }}
                className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
              >
                Filter zurücksetzen
              </button>
            )}
          </aside>
        )}

        {/* 3. MAIN LIST AREA */}
        <main
          className="flex-1 overflow-y-auto bg-[#050505] custom-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Table Header (Hidden on Mobile) */}
          <div className="sticky top-0 z-10 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-10 py-4 hidden sm:flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            <div className="w-1/4">Partner</div>
            <div className="flex-1 px-6">Expertise & Leistungen</div>
            <div className="w-48">Region</div>
            <div className="w-40 text-right">Optionen</div>
          </div>

          <div className="divide-y divide-white/5">
            {resources.map((res, index) => (
              <div 
                key={res.id} 
                ref={index === resources.length - 1 ? lastElementRef : null}
                className="flex flex-col sm:flex-row sm:items-start px-8 sm:px-10 py-4 hover:bg-white/[0.03] transition-all group gap-4 sm:gap-0 border-b border-white/5 last:border-0"
              >
                {/* Company Info */}
                <div className="w-full sm:w-1/4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[#FF9900] group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-base truncate group-hover:text-[#FF9900] transition-colors">{res.title}</h4>
                    <div className="inline-block mt-0.5 px-2 py-0.5 rounded bg-[#FF9900]/10 border border-[#FF9900]/20">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#FF9900]">{res.type || res.category}</span>
                    </div>
                  </div>
                </div>

                {/* Description - FULL TEXT, NO CLAMP */}
                <div className="flex-1 sm:px-6 space-y-3">
                                  <p className="text-sm text-white/60 leading-relaxed max-w-4xl">
                                    {res.description || 'Global B2B Partner für Stake & Scale Mitglieder.'}
                                  </p>
                  
                                  {/* PRO PRICING TABLE (NEW) */}
                                  {res.contactInfo?.prices_2026 && (
                                    <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#FF9900]/80">
                                        <TrendingUp className="w-3 h-3" /> Tarife & Konditionen 2026
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Object.entries(res.contactInfo.prices_2026).map(([label, price]: [string, any]) => (
                                          <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5">
                                            <span className="text-[10px] text-white/40 truncate mr-2">{label}</span>
                                            <span className="text-[11px] font-bold text-white whitespace-nowrap">{price}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Enhanced Info Row */}
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/30">
                      <MapPin className="w-3.5 h-3.5 text-[#FF9900]/50" />
                      {res.location || 'EU'}
                    </div>
                    {res.contactInfo?.email && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/30">
                        <Mail className="w-3.5 h-3.5 text-blue-400/50" />
                        {res.contactInfo.email}
                      </div>
                    )}
                    {res.contactInfo?.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/30">
                        <Phone className="w-3.5 h-3.5 text-green-400/50" />
                        {res.contactInfo.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="w-full sm:w-40 flex justify-end items-start pt-1">
                  <button
                    onClick={() => handleImport(res.id)}
                    disabled={!!importingId}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-[#FF9900] hover:text-black border border-white/10 hover:border-[#FF9900] rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all disabled:opacity-50 active:scale-95 shadow-lg hover:shadow-[#FF9900]/10"
                  >
                    {importingId === res.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importieren'}
                  </button>
                </div>
              </div>
            ))}

            {loading && (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Lade Netzwerkdaten...</p>
              </div>
            )}

            {!loading && resources.length === 0 && (
              <div className="py-40 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Filter className="w-10 h-10 text-white/10" />
                </div>
                <h3 className="text-xl font-instrument-serif text-white/80 uppercase tracking-widest">Keine Treffer</h3>
                <p className="text-sm text-white/20 mt-2">Versuche die Filter zurückzusetzen oder die Suche zu ändern.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. FOOTER */}
      <footer className="flex-none bg-black border-t border-white/10 px-8 py-4 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
          {resources.length} von {totalCount} Partnern in dieser Ansicht
        </p>
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-white/10">
          <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> Global Network active</span>
          <span>Stake & Scale OS</span>
        </div>
      </footer>
    </div>
  );
}
