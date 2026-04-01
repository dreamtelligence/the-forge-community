'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudioShell } from '@/app/components/forge/StudioShell';
import { 
  Factory, 
  Package, 
  Truck, 
  BarChart3, 
  Boxes,
  Plus, 
  Search, 
  Filter,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Sparkles,
  Radar
} from 'lucide-react';
import { AddSupplierModal } from '@/app/components/sourcing/AddSupplierModal';
import { AddSampleModal } from '@/app/components/sourcing/AddSampleModal';
import { AddOrderModal } from '@/app/components/sourcing/AddOrderModal';
import { AISourcingModal } from '@/app/components/sourcing/AISourcingModal';
import { DirectoryImportModal } from '@/app/components/sourcing/DirectoryImportModal';
import WarehousePanel from '@/app/components/sourcing/WarehousePanel';
import TrendRadar from '@/app/components/sourcing/TrendRadar';
import { SourcingTour } from '@/app/components/onboarding/SourcingTour';

type TabType = 'suppliers' | 'samples' | 'orders' | 'overview' | 'trends' | 'warehouse';

export default function SourcingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ventureId = params.ventureId as string;
  const initialTab = searchParams.get('tab') as TabType;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'suppliers');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Modal States
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    // Only fetch sourcing data if not on trends tab to save resources, or keep it simple
    setLoading(true);
    try {
      const [supRes, samRes, ordRes] = await Promise.all([
        fetch(`/api/ventures/${ventureId}/sourcing/suppliers`),
        fetch(`/api/ventures/${ventureId}/sourcing/samples`),
        fetch(`/api/ventures/${ventureId}/sourcing/orders`)
      ]);

      if (supRes.ok) setSuppliers(await supRes.json());
      if (samRes.ok) setSamples(await samRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch (err) {
      console.error('Failed to fetch sourcing data', err);
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  const updateSampleStatus = async (sampleId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/samples/${sampleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/ventures/${ventureId}/sourcing/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  useEffect(() => {
    if (activeTab !== 'trends' && activeTab !== 'warehouse') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activeTab, fetchData]);

  return (
    <StudioShell
      title="Sourcing Studio"
      description="Lieferanten-Management & Produktions-Tracking"
      icon={<Factory className="w-6 h-6 text-[#FF9900]" />}
    >
      <SourcingTour />
      <div className="space-y-6">
        {/* Tabs Navigation */}
        <div className="flex w-full gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 md:w-fit">
          {[
            { id: 'suppliers', label: 'Lieferanten', icon: Factory },
            { id: 'samples', label: 'Muster / Samples', icon: Package },
            { id: 'orders', label: 'Aufträge', icon: Truck },
            { id: 'warehouse', label: 'Warehouse', icon: Boxes },
            { id: 'trends', label: 'Trend Radar', icon: Radar },
            { id: 'overview', label: 'Übersicht', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex min-w-max items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-[#FF9900] text-black font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'trends' ? (
            <TrendRadar />
          ) : activeTab === 'warehouse' ? (
            <WarehousePanel ventureId={ventureId} />
          ) : loading ? (
            <div className="flex items-center justify-center h-64 text-white/40">
              <Clock className="w-6 h-6 animate-spin mr-2" />
              Daten werden geladen...
            </div>
          ) : (
            <>
              {activeTab === 'suppliers' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="text"
                          placeholder="Lieferanten suchen..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-[#FF9900] outline-none"
                        />
                      </div>
                      <button className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
                        <Filter className="w-4 h-4" />
                        Filter
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button 
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FF9900]/30 bg-gradient-to-r from-[#FF9900] to-[#FF9900] px-4 py-2 text-sm font-bold text-black shadow-lg shadow-[#FF9900]/20 transition-all hover:opacity-90 sm:w-auto"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Discovery
                      </button>
                      <button 
                        onClick={() => setIsDirectoryModalOpen(true)}
                        data-tour="sourcing-network-btn"
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#FF9900] transition-all hover:bg-[#FF9900]/10 sm:w-auto"
                      >
                        <Globe className="w-4 h-4" />
                        Aus Netzwerk
                      </button>
                      <button 
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/10 sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Manuell
                      </button>
                    </div>
                  </div>

                  {suppliers.length === 0 ? (
                    <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Factory className="w-8 h-8 text-white/20" />
                      </div>
                      <h3 className="text-xl font-instrument-serif text-white">Noch keine Lieferanten</h3>
                      <p className="text-white/40 max-w-sm mx-auto">
                        Füge deinen ersten Lieferanten hinzu, um Samples und Aufträge zu verwalten.
                      </p>
                      <button 
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9900] text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-4 h-4" />
                        Jetzt hinzufügen
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suppliers.map((supplier) => (
                        <Link 
                          key={supplier.id} 
                          href={`/forge/${ventureId}/sourcing/suppliers/${supplier.id}`}
                          className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 hover:border-[#FF9900]/30 transition-colors group cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded border border-[#FF9900]/20">
                                {supplier.category}
                              </span>
                              <h3 className="text-xl font-instrument-serif text-white mt-2 group-hover:text-[#FF9900] transition-colors">
                                {supplier.companyName}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm font-bold">{supplier.rating || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm text-white/60">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              {supplier.country || 'Kein Land'}
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              MOQ: {supplier.moq || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Lead Time: {supplier.leadTimeDays ? `${supplier.leadTimeDays} Tage` : 'N/A'}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-3">
                              {supplier.email && <Mail className="w-4 h-4 text-white/20" />}
                              {supplier.phone && <Phone className="w-4 h-4 text-white/20" />}
                              {supplier.website && <ExternalLink className="w-4 h-4 text-white/20" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]/60 group-hover:text-[#FF9900] transition-colors">
                              Details ansehen →
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'samples' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-instrument-serif text-white">Muster-Tracking</h2>
                    <button 
                      onClick={() => setIsSampleModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF9900] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Neues Sample anfordern
                    </button>
                  </div>

                  {samples.length === 0 ? (
                    <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Package className="w-8 h-8 text-white/20" />
                      </div>
                      <h3 className="text-xl font-instrument-serif text-white">Keine Muster vorhanden</h3>
                      <p className="text-white/40 max-w-sm mx-auto">
                        Tracke hier deine Musterbestellungen von der Anfrage bis zur Qualitätsprüfung.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 md:hidden">
                        {samples.map((sample) => (
                          <div key={sample.id} className="glass-card rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-white">{sample.productName}</div>
                                <div className="text-xs text-white/40">ID: {sample.id.slice(-6)}</div>
                                <div className="mt-2 text-xs text-white/60">
                                  Lieferant: {sample.supplier?.companyName || 'Unbekannt'}
                                </div>
                              </div>
                              <select
                                value={sample.status}
                                onChange={(e) => updateSampleStatus(sample.id, e.target.value)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-black/20 border border-white/10 outline-none cursor-pointer transition-colors ${
                                  sample.status === 'APPROVED' ? 'text-green-400 border-green-500/30' :
                                  sample.status === 'REJECTED' ? 'text-red-400 border-red-500/30' :
                                  'text-[#FF9900] border-[#FF9900]/30'
                                }`}
                              >
                                <option value="REQUESTED">Angefordert</option>
                                <option value="ORDERED">Bestellt</option>
                                <option value="IN_TRANSIT">Unterwegs</option>
                                <option value="RECEIVED">Erhalten</option>
                                <option value="APPROVED">Abgenommen</option>
                                <option value="REJECTED">Abgelehnt</option>
                              </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
                              <span>Bestellt am: {sample.orderedAt ? new Date(sample.orderedAt).toLocaleDateString() : '-'}</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className={`w-3 h-3 ${i <= (sample.qualityRating || 0) ? 'text-yellow-500 fill-current' : 'text-white/10'}`} />
                                ))}
                              </div>
                            </div>
                            <button className="inline-flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white">
                              <ExternalLink className="w-4 h-4" />
                              Details
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                          <thead>
                            <tr className="text-xs uppercase tracking-widest text-white/40 font-bold">
                              <th className="px-6 py-2">Produkt</th>
                              <th className="px-6 py-2">Lieferant</th>
                              <th className="px-6 py-2">Status</th>
                              <th className="px-6 py-2">Bestellt am</th>
                              <th className="px-6 py-2">Qualität</th>
                              <th className="px-6 py-2">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {samples.map((sample) => (
                              <tr key={sample.id} className="glass-card bg-white/5 group hover:bg-white/10 transition-colors">
                                <td className="px-6 py-4 rounded-l-xl">
                                  <div className="font-semibold text-white">{sample.productName}</div>
                                  <div className="text-xs text-white/40">ID: {sample.id.slice(-6)}</div>
                                </td>
                                <td className="px-6 py-4 text-white/60">
                                  {sample.supplier?.companyName || 'Unbekannt'}
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={sample.status}
                                    onChange={(e) => updateSampleStatus(sample.id, e.target.value)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-black/20 border border-white/10 outline-none cursor-pointer transition-colors ${
                                      sample.status === 'APPROVED' ? 'text-green-400 border-green-500/30' :
                                      sample.status === 'REJECTED' ? 'text-red-400 border-red-500/30' :
                                      'text-[#FF9900] border-[#FF9900]/30'
                                    }`}
                                  >
                                    <option value="REQUESTED">Angefordert</option>
                                    <option value="ORDERED">Bestellt</option>
                                    <option value="IN_TRANSIT">Unterwegs</option>
                                    <option value="RECEIVED">Erhalten</option>
                                    <option value="APPROVED">Abgenommen</option>
                                    <option value="REJECTED">Abgelehnt</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-white/60">
                                  {sample.orderedAt ? new Date(sample.orderedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                      <Star key={i} className={`w-3 h-3 ${i <= (sample.qualityRating || 0) ? 'text-yellow-500 fill-current' : 'text-white/10'}`} />
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 rounded-r-xl">
                                  <button className="text-white/40 hover:text-white transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-instrument-serif text-white">Produktionsaufträge</h2>
                    <button 
                      onClick={() => setIsOrderModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF9900] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Neuer Auftrag (PO)
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Truck className="w-8 h-8 text-white/20" />
                      </div>
                      <h3 className="text-xl font-instrument-serif text-white">Keine Aufträge</h3>
                      <p className="text-white/40 max-w-sm mx-auto">
                        Verwalte hier deine POs (Purchase Orders) und behalte den Lieferstatus im Blick.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {orders.map((order) => (
                        <div key={order.id} className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#FF9900]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-[#FF9900]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">{order.orderNumber}</h3>
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/20 border border-white/10 outline-none cursor-pointer ${
                                    order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'text-green-400 border-green-500/30' : 'text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  <option value="DRAFT">Entwurf</option>
                                  <option value="SENT">Gesendet</option>
                                  <option value="CONFIRMED">Bestätigt</option>
                                  <option value="IN_PRODUCTION">In Produktion</option>
                                  <option value="SHIPPED">Versendet</option>
                                  <option value="DELIVERED">Geliefert</option>
                                  <option value="COMPLETED">Abgeschlossen</option>
                                  <option value="CANCELLED">Storniert</option>
                                </select>
                              </div>
                              <p className="text-sm text-white/60">{order.productName} • {order.supplier?.companyName}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Menge</p>
                              <p className="text-white font-semibold">{order.quantity} Stk.</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Gesamtpreis</p>
                              <p className="text-white font-semibold">{order.totalPrice} {order.currency}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Lieferdatum</p>
                              <p className="text-white font-semibold">{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'TBD'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Zahlung</p>
                              <p className={`text-xs font-bold ${order.paymentStatus === 'FULLY_PAID' ? 'text-green-400' : 'text-yellow-500'}`}>
                                {order.paymentStatus}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Factory className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-xs text-green-400 font-bold">+2 diesen Monat</span>
                    </div>
                    <div>
                      <h4 className="text-white/40 text-sm font-bold uppercase tracking-widest">Lieferanten</h4>
                      <p className="text-3xl font-instrument-serif text-white">{suppliers.length}</p>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-[#FF9900]/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#FF9900]" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white/40 text-sm font-bold uppercase tracking-widest">Offene Samples</h4>
                      <p className="text-3xl font-instrument-serif text-white">
                        {samples.filter(s => s.status !== 'APPROVED' && s.status !== 'REJECTED').length}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white/40 text-sm font-bold uppercase tracking-widest">Laufende Aufträge</h4>
                      <p className="text-3xl font-instrument-serif text-white">
                        {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white/40 text-sm font-bold uppercase tracking-widest">Bestellvolumen</h4>
                      <p className="text-3xl font-instrument-serif text-white">
                        {orders.reduce((acc, curr) => acc + curr.totalPrice, 0).toLocaleString()} {orders[0]?.currency || 'EUR'}
                      </p>
                    </div>
                  </div>

                  {/* Prototyping Section */}
                  <div className="col-span-full glass-card p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-instrument-serif text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-[#FF9900]" />
                        Anstehende Aufgaben
                      </h3>
                      <p className="text-white/60">Behalte deine Deadlines und Quality-Checks im Auge.</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white">Sample Check: Bio-Baumwolle T-Shirt</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
            </div>
      
            {/* Modals */}
            <AddSupplierModal
              isOpen={isSupplierModalOpen}
              onClose={() => setIsSupplierModalOpen(false)}
              onSuccess={fetchData}
              ventureId={ventureId}
            />
            <AddSampleModal
              isOpen={isSampleModalOpen}
              onClose={() => setIsSampleModalOpen(false)}
              onSuccess={fetchData}
              ventureId={ventureId}
            />
            <AddOrderModal
              isOpen={isOrderModalOpen}
              onClose={() => setIsOrderModalOpen(false)}
              onSuccess={fetchData}
              ventureId={ventureId}
            />
            <AISourcingModal
              isOpen={isAIModalOpen}
              onClose={() => setIsAIModalOpen(false)}
              onSuccess={fetchData}
              ventureId={ventureId}
            />
            <DirectoryImportModal
              isOpen={isDirectoryModalOpen}
              onClose={() => setIsDirectoryModalOpen(false)}
              onImported={fetchData}
              ventureId={ventureId}
            />
          </StudioShell>
        );
      }
      
