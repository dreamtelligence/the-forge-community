'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Truck, 
  ExternalLink, 
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ventureId = params.ventureId as string;
  const supplierId = params.supplierId as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/suppliers/${supplierId}`);
      if (res.ok) {
        setSupplier(await res.json());
      } else {
        router.push(`/forge/${ventureId}/sourcing`);
      }
    } catch (err) {
      console.error('Failed to fetch', err);
    } finally {
      setLoading(false);
    }
  }, [ventureId, supplierId, router]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" />
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href={`/forge/${ventureId}/sourcing?tab=suppliers`}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all group"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded border border-[#FF9900]/20">
                {supplier.category}
              </span>
              {supplier.country && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <MapPin className="w-3 h-3" /> {supplier.country}
                </div>
              )}
            </div>
            <h1 className="text-4xl font-instrument-serif text-white">{supplier.companyName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {supplier.website && (
            <a 
              href={supplier.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Website
            </a>
          )}
          <button className="flex items-center gap-2 px-6 py-3 bg-[#FF9900] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-[#FF9900]/10">
            Edit Partner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area - Now on the left (col-span-2) */}
        <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
          
          {/* Active Samples Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-instrument-serif text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" /> Muster & Prototypen
              </h2>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" /> Sample anfordern
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplier.samples.length === 0 ? (
                <div className="col-span-full py-12 px-8 rounded-3xl border border-dashed border-white/10 text-center text-white/20">
                  Keine Muster für diesen Partner hinterlegt.
                </div>
              ) : (
                supplier.samples.map((sample: any) => (
                  <div key={sample.id} className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group">
                    <div className="min-w-0">
                      <h4 className="font-bold text-white truncate">{sample.productName}</h4>
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mt-1">Status: {sample.status}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                      {sample.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Orders Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-instrument-serif text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-400" /> Produktionsaufträge
              </h2>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-400 hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" /> Neuer Auftrag
              </button>
            </div>

            <div className="space-y-3">
              {supplier.orders.length === 0 ? (
                <div className="py-12 px-8 rounded-3xl border border-dashed border-white/10 text-center text-white/20">
                  Noch keine POs (Purchase Orders) vorhanden.
                </div>
              ) : (
                supplier.orders.map((order: any) => (
                  <div key={order.id} className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:border-green-500/30 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <FileText className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{order.orderNumber}</h4>
                        <p className="text-sm text-white/40">{order.productName} • {order.quantity} Einheiten</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{order.totalPrice.toLocaleString()} {order.currency}</p>
                      <p className="text-[10px] font-black uppercase text-green-400/60 tracking-widest mt-1">{order.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Notes Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-instrument-serif text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-white/20" /> Interne Notizen
            </h2>
            <div className="p-8 rounded-[2.5rem] bg-white/2 border border-white/5 text-sm text-white/50 leading-relaxed italic">
              {supplier.notes || 'Keine speziellen Notizen oder Warnhinweise für diesen Partner vorhanden.'}
            </div>
          </section>
        </div>

        {/* Sidebar: Info Card - Now on the right (col-span-1) */}
        <div className="space-y-6 order-1 lg:order-2">
          <section className="glass-card p-8 rounded-[2.5rem] border border-white/10 space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/20 mb-6">Kontaktinformationen</h3>
              <div className="space-y-5">
                {supplier.email && (
                  <div className="flex items-center gap-4 text-white/60 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-colors">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">E-Mail</p>
                      <p className="text-sm font-bold truncate">{supplier.email}</p>
                    </div>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-4 text-white/60 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-green-500/30 transition-colors">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Telefon</p>
                      <p className="text-sm font-bold">{supplier.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-4 text-white/60 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-red-500/30 transition-colors">
                    <MapPin className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Anschrift</p>
                    <p className="text-sm font-medium leading-relaxed">{supplier.address || 'Keine Adresse hinterlegt'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/20">Konditionen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">MOQ</p>
                  <p className="text-sm font-bold text-[#FF9900]">{supplier.moq || 'Verhandelbar'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Lead Time</p>
                  <p className="text-sm font-bold text-white">{supplier.leadTimeDays ? `${supplier.leadTimeDays} Tage` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Partner Status Box */}
          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#FF9900]/10 to-transparent border border-[#FF9900]/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF9900]/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#FF9900]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Verifizierter Partner</p>
              <p className="text-xs text-[#FF9900]/60">Teil deines Netzwerks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
