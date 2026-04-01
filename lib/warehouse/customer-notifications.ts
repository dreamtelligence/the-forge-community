import { Resend } from 'resend';

type WarehouseCustomerNotificationInput = {
  to: string;
  subject: string;
  message: string;
  trackingNumber?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  receiptNumber?: string | null;
};

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromAddress =
  process.env.WAREHOUSE_RESEND_FROM || process.env.AUTH_RESEND_FROM || 'onboarding@resend.dev';
const defaultSenderName = process.env.WAREHOUSE_RESEND_FROM_NAME || 'LagerHub';

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createFromAddress(): string {
  if (defaultFromAddress.includes('<')) return defaultFromAddress;
  return `${defaultSenderName} <${defaultFromAddress}>`;
}

export async function notifyWarehouseCustomer(
  input: WarehouseCustomerNotificationInput
): Promise<{ sent: boolean; reason?: string }> {
  const to = input.to.trim().toLowerCase();
  if (!to) return { sent: false, reason: 'MISSING_TO' };
  if (!resendApiKey) return { sent: false, reason: 'RESEND_NOT_CONFIGURED' };

  const details = [
    input.status ? `Status: ${input.status}` : null,
    input.trackingNumber ? `Tracking: ${input.trackingNumber}` : null,
    input.orderNumber ? `Order: ${input.orderNumber}` : null,
    input.receiptNumber ? `Abholquittung: ${input.receiptNumber}` : null,
  ].filter(Boolean) as string[];

  const detailsHtml = details.length
    ? `<ul>${details.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>`
    : '';

  const detailsText = details.length ? `\n${details.map((entry) => `- ${entry}`).join('\n')}` : '';

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: createFromAddress(),
      to,
      subject: input.subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;">
<p>${escapeHtml(input.message)}</p>
${detailsHtml}
<p style="color:#666;font-size:12px;">Automatische LagerHub-Benachrichtigung.</p>
</div>`,
      text: `${input.message}${detailsText}\n\nAutomatische LagerHub-Benachrichtigung.`,
    });
    return { sent: true };
  } catch (error) {
    console.error('Warehouse customer notification failed:', error);
    return { sent: false, reason: 'SEND_FAILED' };
  }
}

