import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, Euro, User, TrendingUp } from 'lucide-react';

export default async function AdminFinancePage() {
  if (!(await isAdmin())) {
    redirect('/forum');
  }

  // Fetch all financial data
  const [
    invoices,
,
    creditPurchases,
    ledgerEntries,
    stats
  ] = await Promise.all([
    // All invoices
    prisma.platformInvoice.findMany({
      include: {
        lineItems: true,
        creditPurchase: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // All documents
    prisma.platformDocument.findMany({
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // All credit purchases
    prisma.platformCreditPurchase.findMany({
      include: {
        user: { select: { email: true, name: true } },
        invoice: { select: { invoiceNumber: true, pdfUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // Recent ledger entries
    prisma.platformLedgerEntry.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { bookedAt: 'desc' },
      take: 30,
    }),

    // Calculate stats
    prisma.platformLedgerEntry.aggregate({
      where: { direction: 'INCOME' },
      _sum: { amountGross: true },
      _count: true,
    }),
  ]);

  const totalRevenue = stats._sum.amountGross || 0;
  const totalTransactions = stats._count;

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-instrument-serif">Platform Finance</h1>
            <p className="text-white/40 mt-2">Rechnungen, Belege & EÜR-Buchungen</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            ← Zurück
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Euro className="w-5 h-5 text-green-500" />
              <span className="text-white/40 text-sm">Umsatz (Total)</span>
            </div>
            <div className="text-3xl font-instrument-serif">
              {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalRevenue)}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-white/40 text-sm">Rechnungen</span>
            </div>
            <div className="text-3xl font-instrument-serif">{invoices.length}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-white/40 text-sm">Transaktionen</span>
            </div>
            <div className="text-3xl font-instrument-serif">{totalTransactions}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-yellow-500" />
              <span className="text-white/40 text-sm">Credit Käufe</span>
            </div>
            <div className="text-3xl font-instrument-serif">{creditPurchases.length}</div>
          </div>
        </div>

        {/* Invoices */}
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-2xl font-instrument-serif mb-6">Rechnungen</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Rechnungsnr.</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Kunde</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Datum</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Betrag</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">{invoice.buyerName}</td>
                    <td className="py-3 px-4 text-white/60 text-sm">
                      {new Date(invoice.issueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: invoice.currency,
                      }).format(invoice.total)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                        invoice.status === 'ISSUED' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Purchases */}
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-2xl font-instrument-serif mb-6">Credit-Käufe</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Credits</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Betrag</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Rechnung</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {creditPurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{purchase.user.name || 'N/A'}</div>
                        <div className="text-sm text-white/40">{purchase.user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{purchase.credits}</td>
                    <td className="py-3 px-4 text-right">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: purchase.currency,
                      }).format(purchase.amountGross)}
                    </td>
                    <td className="py-3 px-4">
                      {purchase.invoice ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{purchase.invoice.invoiceNumber}</span>
                          {purchase.invoice.pdfUrl && (
                            <a
                              href={purchase.invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white/60 text-sm">
                      {new Date(purchase.createdAt).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EÜR Buchungen */}
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-2xl font-instrument-serif mb-6">EÜR-Buchungen (Ledger)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Datum</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Typ</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Quelle</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Beschreibung</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Betrag</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-sm text-white/60">
                      {new Date(entry.bookedAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.direction === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {entry.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{entry.source}</td>
                    <td className="py-3 px-4 text-sm text-white/60">{entry.description || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: entry.currency,
                      }).format(entry.amountGross)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {entry.user?.email || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
