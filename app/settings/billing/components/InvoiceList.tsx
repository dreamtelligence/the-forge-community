'use client';

import { FileText, Download } from 'lucide-react';

interface InvoiceListProps {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    total: number;
    currency: string;
    status: string;
    issueDate: Date;
    pdfUrl: string | null;
    lineItems: Array<{
      id: string;
      description: string;
    }>;
  }>;
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'ISSUED':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'VOID':
      case 'REFUNDED':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Bezahlt';
      case 'ISSUED':
        return 'Ausstehend';
      case 'VOID':
        return 'Storniert';
      case 'REFUNDED':
        return 'Erstattet';
      default:
        return status;
    }
  };

  const formatIssueDate = (value: Date) =>
    new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value));

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
            Rechnungen & Käufe
          </div>
          <h2 className="text-2xl font-instrument-serif text-white">
            Invoice History
          </h2>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-sm text-white/40">Noch keine Rechnungen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const headline = invoice.lineItems[0]?.description || 'Invoice';
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-4 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-white font-medium">
                        {headline}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(invoice.status)}`}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span>{formatIssueDate(invoice.issueDate)}</span>
                      <span className="font-mono">{invoice.invoiceNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-instrument-serif text-white">
                      {formatAmount(invoice.total, invoice.currency)}
                    </div>
                  </div>

                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-white/60 hover:text-white"
                      title="Rechnung herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invoices.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Alle Rechnungen werden für 10 Jahre archiviert (GoBD-konform)
          </p>
        </div>
      )}
    </div>
  );
}
