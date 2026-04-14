import { prisma } from '@/lib/database/prisma';

export async function getOrCreatePlatformTaxProfile() {
  let profile = await prisma.platformTaxProfile.findFirst({
    where: { smallBusiness: true },
  });

  if (!profile) {
    profile = await prisma.platformTaxProfile.create({
      data: {
        businessName: process.env.PLATFORM_BUSINESS_NAME || 'STAKE & SCALE',
        businessType: process.env.PLATFORM_BUSINESS_TYPE || 'Einzelunternehmen',
        addressStreet: process.env.PLATFORM_BUSINESS_STREET || 'Musterstraße 1',
        addressZip: process.env.PLATFORM_BUSINESS_ZIP || '12345',
        addressCity: process.env.PLATFORM_BUSINESS_CITY || 'Berlin',
        addressCountry: process.env.PLATFORM_BUSINESS_COUNTRY || 'Germany',
        smallBusiness: process.env.PLATFORM_SMALL_BUSINESS !== 'false',
        defaultCurrency: process.env.PLATFORM_DEFAULT_CURRENCY || 'EUR',
        invoiceNote: process.env.PLATFORM_INVOICE_NOTE || 'Vielen Dank für Ihren Einkauf!',
      },
    });
  }

  return profile;
}
