import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type {
  PlatformInvoice,
  PlatformInvoiceLine,
  PlatformTaxProfile,
} from '@prisma/client';

type InvoicePdfInput = {
  invoice: PlatformInvoice;
  lineItems: PlatformInvoiceLine[];
  profile: PlatformTaxProfile;
};

type AddressLike = {
  line1?: string | null;
  line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
  },
  companyBlock: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  section: {
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaBlock: {
    width: '48%',
  },
  label: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#666666',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #DDDDDD',
    paddingBottom: 6,
    marginBottom: 6,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#666666',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottom: '1px solid #F0F0F0',
  },
  colDesc: { width: '52%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '18%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  totals: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: '55%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalStrong: {
    fontWeight: 700,
  },
  note: {
    marginTop: 18,
    fontSize: 9,
    color: '#555555',
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 28,
    borderTop: '1px solid #EEEEEE',
    paddingTop: 10,
    fontSize: 9,
    color: '#666666',
  },
});

const formatDate = (value?: Date | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

const formatMoney = (value: number, currency: string) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value);
};

const normalizeAddress = (raw: unknown): AddressLike => {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, string | null>;
  return {
    line1: record.line1 ?? null,
    line2: record.line2 ?? null,
    postal_code: record.postal_code ?? null,
    city: record.city ?? null,
    state: record.state ?? null,
    country: record.country ?? null,
  };
};

const InvoicePdfDocument = ({ invoice, lineItems, profile }: InvoicePdfInput) => {
  const buyerAddress = normalizeAddress(invoice.buyerAddress);
  const servicePeriod = invoice.servicePeriodStart || invoice.servicePeriodEnd
    ? `${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Rechnung</Text>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{profile.businessName}</Text>
            <Text>{profile.addressStreet}</Text>
            <Text>{`${profile.addressZip} ${profile.addressCity}`}</Text>
            <Text>{profile.addressCountry}</Text>
            {profile.taxNumber && <Text>Steuernummer: {profile.taxNumber}</Text>}
            {profile.vatId && <Text>USt-IdNr: {profile.vatId}</Text>}
            {profile.invoiceEmail && <Text>{profile.invoiceEmail}</Text>}
          </View>
        </View>

        <View style={[styles.section, styles.metaRow]}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Rechnungsdaten</Text>
            <Text>Rechnungsnummer: {invoice.invoiceNumber}</Text>
            <Text>Rechnungsdatum: {formatDate(invoice.issueDate)}</Text>
            <Text>Leistungsdatum: {formatDate(invoice.serviceDate)}</Text>
            {servicePeriod && <Text>Leistungszeitraum: {servicePeriod}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Kunde</Text>
            <Text>{invoice.buyerName}</Text>
            {invoice.buyerEmail && <Text>{invoice.buyerEmail}</Text>}
            {buyerAddress.line1 && <Text>{buyerAddress.line1}</Text>}
            {buyerAddress.line2 && <Text>{buyerAddress.line2}</Text>}
            {(buyerAddress.postal_code || buyerAddress.city) && (
              <Text>{`${buyerAddress.postal_code ?? ''} ${buyerAddress.city ?? ''}`.trim()}</Text>
            )}
            {buyerAddress.country && <Text>{buyerAddress.country}</Text>}
            {invoice.buyerTaxNumber && <Text>Steuernummer: {invoice.buyerTaxNumber}</Text>}
            {invoice.buyerVatId && <Text>USt-IdNr: {invoice.buyerVatId}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Leistung</Text>
            <Text style={styles.colQty}>Menge</Text>
            <Text style={styles.colPrice}>Preis</Text>
            <Text style={styles.colTotal}>Gesamt</Text>
          </View>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.unitPrice, invoice.currency)}</Text>
              <Text style={styles.colTotal}>{formatMoney(item.totalAmount, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Zwischensumme</Text>
            <Text>{formatMoney(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text>MwSt ({invoice.taxRate}%)</Text>
              <Text>{formatMoney(invoice.taxAmount, invoice.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalStrong]}>
            <Text>Gesamt</Text>
            <Text>{formatMoney(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.smallBusinessNote && (
          <Text style={styles.note}>{invoice.smallBusinessNote}</Text>
        )}
        {profile.invoiceNote && <Text style={styles.note}>{profile.invoiceNote}</Text>}

        {(profile.bankIban || profile.bankBic) && (
          <View style={styles.footer}>
            <Text style={styles.label}>Bankverbindung</Text>
            {profile.bankIban && <Text>IBAN: {profile.bankIban}</Text>}
            {profile.bankBic && <Text>BIC: {profile.bankBic}</Text>}
          </View>
        )}
      </Page>
    </Document>
  );
};

export async function renderInvoicePdfBuffer({ invoice, lineItems, profile }: InvoicePdfInput) {
  return renderToBuffer(
    <InvoicePdfDocument invoice={invoice} lineItems={lineItems} profile={profile} />
  );
}
