import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getFinanceReconciliationReport } from '@/lib/finance-reconciliation';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Euro,
  FileText,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default async function AdminFinancePage() {
  if (!(await isAdmin())) {
    redirect('/forum');
  }

  const [invoices, documents, creditPurchases, ledgerEntries, auditLogs, stats, reconciliation] =
    await Promise.all([
      prisma.platformInvoice.findMany({
        include: {
          lineItems: true,
          creditPurchase: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.platformDocument.findMany({
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.platformCreditPurchase.findMany({
        include: {
          user: { select: { email: true, name: true } },
          invoice: { select: { invoiceNumber: true, pdfUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.platformLedgerEntry.findMany({
        include: {
          user: { select: { email: true, name: true } },
          reversedByEntry: {
            select: {
              id: true,
              bookedAt: true,
            },
          },
        },
        orderBy: { bookedAt: 'desc' },
        take: 30,
      }),
      prisma.financeAuditLog.findMany({
        include: {
          actor: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.platformLedgerEntry.aggregate({
        where: { direction: 'INCOME' },
        _sum: { amountGross: true },
        _count: true,
      }),
      getFinanceReconciliationReport({
        daysBack: 180,
        maxItems: 300,
      }),
    ]);

  const totalRevenue = stats._sum.amountGross || 0;
  const totalTransactions = stats._count;
  const reversedEntries = ledgerEntries.filter((entry) => entry.reversedByEntry).length;
  const topIssues = reconciliation.issues.slice(0, 10);
  const severityStyles = {
    high: 'bg-red-500/10 text-red-300',
    medium: 'bg-yellow-500/10 text-yellow-300',
    low: 'bg-blue-500/10 text-blue-300',
  } as const;
  const checkStyles = {
    ok: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200',
    warning: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-200',
    error: 'border-red-500/20 bg-red-500/5 text-red-200',
  } as const;

  return (
    <div className="min-h-screen bg-[#0A0B0D] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-instrument-serif">Platform Finance</h1>
            <p className="mt-2 text-white/40">
              Append-only Ledger, Rechnungen, Belege und Audit-Trail
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/api/admin/finance/reconciliation?daysBack=180&maxItems=300"
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/15"
            >
              Integrity JSON
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              ← Zurück
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-2 flex items-center gap-3">
              <Euro className="h-5 w-5 text-green-500" />
              <span className="text-sm text-white/40">Umsatz</span>
            </div>
            <div className="text-3xl font-instrument-serif">{formatCurrency(totalRevenue)}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-2 flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-white/40">Rechnungen</span>
            </div>
            <div className="text-3xl font-instrument-serif">{invoices.length}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-2 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-white/40">Ledger-Einträge</span>
            </div>
            <div className="text-3xl font-instrument-serif">{totalTransactions}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-2 flex items-center gap-3">
              <User className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-white/40">Credit-Käufe</span>
            </div>
            <div className="text-3xl font-instrument-serif">{creditPurchases.length}</div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="mb-2 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <span className="text-sm text-white/40">Audit-Events</span>
            </div>
            <div className="text-3xl font-instrument-serif">{auditLogs.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <h2 className="mb-4 text-2xl font-instrument-serif">Finance Guardrails</h2>
            <div className="space-y-3 text-sm text-white/70">
              <p>
                Ledger-Einträge werden append-only geschrieben. Fachliche Korrekturen laufen über
                Gegenbuchungen statt über stille Updates.
              </p>
              <p>
                Rechnungen werden erst nach PDF-Erzeugung und Snapshot final gesperrt. Belege und
                Ledger-Einträge landen zusätzlich im Finance-Audit-Log.
              </p>
              <p>
                Reversals laufen über <code>/api/admin/finance/ledger/[entryId]/reverse</code> mit
                Pflichtbegründung.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <h2 className="mb-4 text-2xl font-instrument-serif">Integrity Scope</h2>
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Checks ohne Befund</span>
                <span className="font-medium text-white">{reconciliation.summary.healthyChecks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Geprüfte Webhooks</span>
                <span className="font-medium text-white">{reconciliation.summary.processedWebhookEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Geprüfte Rechnungen</span>
                <span className="font-medium text-white">
                  {reconciliation.summary.invoicesChecked}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Archivierte Belege</span>
                <span className="font-medium text-white">{documents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Geprüfte Usage-Datensätze</span>
                <span className="font-medium text-white">{reconciliation.summary.usageRecordsChecked}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stornierte Einträge</span>
                <span className="font-medium text-white">{reversedEntries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fenster</span>
                <span className="font-medium text-white">
                  {reconciliation.scope.daysBack} Tage / {reconciliation.scope.maxItems} Datensätze
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-2xl font-instrument-serif">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                Reconciliation Report
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-white/55">
                Der Report prüft die Kette zwischen Stripe-Webhook, Invoice, Credit Purchase,
                Energy Settlement und Ledger. Dadurch fallen fehlende PDFs, fehlende Grants oder
                abgerissene Buchungsreferenzen sofort auf.
              </p>
            </div>
            <div className="text-sm text-white/45">
              Letzter Lauf {new Date(reconciliation.generatedAt).toLocaleString('de-DE')}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-center gap-3 text-red-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">High Severity</span>
              </div>
              <div className="mt-3 text-3xl font-instrument-serif">
                {reconciliation.summary.highIssues}
              </div>
            </div>
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
              <div className="flex items-center gap-3 text-yellow-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">Medium Severity</span>
              </div>
              <div className="mt-3 text-3xl font-instrument-serif">
                {reconciliation.summary.mediumIssues}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
              <div className="flex items-center gap-3 text-blue-300">
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm">Low Severity</span>
              </div>
              <div className="mt-3 text-3xl font-instrument-serif">
                {reconciliation.summary.lowIssues}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">Checks Gesund</span>
              </div>
              <div className="mt-3 text-3xl font-instrument-serif">
                {reconciliation.summary.healthyChecks}/{reconciliation.checks.length}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
            {reconciliation.checks.map((check) => (
              <div
                key={check.code}
                className={`rounded-2xl border p-4 text-sm ${checkStyles[check.status]}`}
              >
                <div className="font-medium">{check.label}</div>
                <p className="mt-2 text-sm/6 text-white/70">{check.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm text-white/50">
            {reconciliation.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="mb-6 text-2xl font-instrument-serif">Offene Integrity Findings</h2>
          {topIssues.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">
              Keine offenen Findings im aktuellen Prüf-Fenster. Archivierte Belege, Reversals und
              Audit-Trail wirken für die letzten {reconciliation.scope.daysBack} Tage konsistent.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left font-medium text-white/60">Severity</th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">Titel</th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">Entity</th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">Beschreibung</th>
                  </tr>
                </thead>
                <tbody>
                  {topIssues.map((issue) => (
                    <tr key={`${issue.code}-${issue.entityId}`} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${severityStyles[issue.severity]}`}
                        >
                          {issue.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/50">{issue.code}</td>
                      <td className="px-4 py-3 text-sm">{issue.title}</td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {issue.entityType}
                        <div className="font-mono text-xs text-white/40">{issue.entityId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{issue.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="mb-6 text-2xl font-instrument-serif">Rechnungen</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-white/60">Rechnungsnr.</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Kunde</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Datum</th>
                  <th className="px-4 py-3 text-right font-medium text-white/60">Betrag</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-white/60">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">{invoice.buyerName}</td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {new Date(invoice.issueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          invoice.status === 'PAID'
                            ? 'bg-green-500/10 text-green-500'
                            : invoice.status === 'ISSUED'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          <Download className="h-4 w-4" />
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

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="mb-6 text-2xl font-instrument-serif">EÜR-Buchungen</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-white/60">Datum</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Typ</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Quelle</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Beschreibung</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-white/60">Betrag</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">User</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry) => {
                  const isReversed = Boolean(entry.reversedByEntry);
                  return (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-white/60">
                        {new Date(entry.bookedAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            entry.direction === 'INCOME'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {entry.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.source}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{entry.description || '-'}</td>
                      <td className="px-4 py-3 text-xs text-white/60">
                        {entry.reversesEntryId
                          ? 'STORNO'
                          : isReversed
                            ? `STORNIERT via ${entry.reversedByEntry?.id}`
                            : 'POSTED'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(entry.amountGross, entry.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{entry.user?.email || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-instrument-serif">
            <ScrollText className="h-5 w-5 text-cyan-400" />
            Finance Audit Trail
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-white/60">Zeit</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Actor</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Request</th>
                  <th className="px-4 py-3 text-left font-medium text-white/60">Grund</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-white/60">
                      {new Date(log.createdAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.entityType}</td>
                    <td className="px-4 py-3 text-sm text-cyan-300">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {log.actor?.email || log.actorEmail || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">
                      {log.requestId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.reason || '-'}</td>
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
