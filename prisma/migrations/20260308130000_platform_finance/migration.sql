-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PlatformLedgerDirection" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PlatformLedgerSource" AS ENUM ('INVOICE', 'CREDIT_PURCHASE', 'CREDIT_USAGE', 'REFUND', 'STRIPE_FEE', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformDocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'STATEMENT', 'CONTRACT', 'EMAIL', 'OTHER');

-- CreateTable
CREATE TABLE "PlatformTaxProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL DEFAULT 'Einzelunternehmen',
    "addressStreet" TEXT NOT NULL,
    "addressZip" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressCountry" TEXT NOT NULL DEFAULT 'Germany',
    "taxNumber" TEXT,
    "vatId" TEXT,
    "taxOfficeName" TEXT,
    "taxOfficeId" TEXT,
    "smallBusiness" BOOLEAN NOT NULL DEFAULT true,
    "invoiceEmail" TEXT,
    "bankIban" TEXT,
    "bankBic" TEXT,
    "logoUrl" TEXT,
    "invoiceNote" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceDate" TIMESTAMP(3),
    "servicePeriodStart" TIMESTAMP(3),
    "servicePeriodEnd" TIMESTAMP(3),
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerTaxNumber" TEXT,
    "buyerVatId" TEXT,
    "buyerAddress" JSONB,
    "buyerCountry" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "isSmallBusiness" BOOLEAN NOT NULL DEFAULT true,
    "smallBusinessNote" TEXT,
    "pdfUrl" TEXT,
    "structuredXmlUrl" TEXT,
    "snapshot" JSONB,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeInvoiceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformLedgerCategory" (
    "id" TEXT NOT NULL,
    "type" "PlatformLedgerDirection" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformLedgerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformLedgerEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "direction" "PlatformLedgerDirection" NOT NULL,
    "source" "PlatformLedgerSource" NOT NULL,
    "sourceId" TEXT,
    "categoryId" TEXT,
    "description" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountNet" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountGross" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "invoiceId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "PlatformDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "sha256" TEXT,
    "issuedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "invoiceId" TEXT,
    "ledgerEntryId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCreditPurchase" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "amountNet" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountGross" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCreditUsage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "energyTransactionId" TEXT,
    "credits" INTEGER NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "feature" TEXT,
    "costAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ledgerEntryId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCreditUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformTaxProfile_ownerId_key" ON "PlatformTaxProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_invoiceNumber_key" ON "PlatformInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_stripePaymentIntentId_key" ON "PlatformInvoice"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_profileId_idx" ON "PlatformInvoice"("profileId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_issueDate_idx" ON "PlatformInvoice"("issueDate");

-- CreateIndex
CREATE INDEX "PlatformInvoice_status_idx" ON "PlatformInvoice"("status");

-- CreateIndex
CREATE INDEX "PlatformInvoiceLine_invoiceId_idx" ON "PlatformInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "PlatformLedgerEntry_profileId_idx" ON "PlatformLedgerEntry"("profileId");

-- CreateIndex
CREATE INDEX "PlatformLedgerEntry_direction_idx" ON "PlatformLedgerEntry"("direction");

-- CreateIndex
CREATE INDEX "PlatformLedgerEntry_bookedAt_idx" ON "PlatformLedgerEntry"("bookedAt");

-- CreateIndex
CREATE INDEX "PlatformLedgerEntry_source_idx" ON "PlatformLedgerEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformLedgerEntry_invoiceId_key" ON "PlatformLedgerEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "PlatformDocument_profileId_idx" ON "PlatformDocument"("profileId");

-- CreateIndex
CREATE INDEX "PlatformDocument_type_idx" ON "PlatformDocument"("type");

-- CreateIndex
CREATE INDEX "PlatformCreditPurchase_profileId_idx" ON "PlatformCreditPurchase"("profileId");

-- CreateIndex
CREATE INDEX "PlatformCreditPurchase_userId_idx" ON "PlatformCreditPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCreditPurchase_invoiceId_key" ON "PlatformCreditPurchase"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCreditPurchase_stripePaymentIntentId_key" ON "PlatformCreditPurchase"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PlatformCreditUsage_profileId_idx" ON "PlatformCreditUsage"("profileId");

-- CreateIndex
CREATE INDEX "PlatformCreditUsage_userId_idx" ON "PlatformCreditUsage"("userId");

-- CreateIndex
CREATE INDEX "PlatformCreditUsage_usedAt_idx" ON "PlatformCreditUsage"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCreditUsage_energyTransactionId_key" ON "PlatformCreditUsage"("energyTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCreditUsage_ledgerEntryId_key" ON "PlatformCreditUsage"("ledgerEntryId");

-- AddForeignKey
ALTER TABLE "PlatformTaxProfile" ADD CONSTRAINT "PlatformTaxProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlatformTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoiceLine" ADD CONSTRAINT "PlatformInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoiceLine" ADD CONSTRAINT "PlatformInvoiceLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlatformLedgerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformLedgerEntry" ADD CONSTRAINT "PlatformLedgerEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlatformTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformLedgerEntry" ADD CONSTRAINT "PlatformLedgerEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlatformLedgerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformLedgerEntry" ADD CONSTRAINT "PlatformLedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformLedgerEntry" ADD CONSTRAINT "PlatformLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDocument" ADD CONSTRAINT "PlatformDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlatformTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDocument" ADD CONSTRAINT "PlatformDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDocument" ADD CONSTRAINT "PlatformDocument_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "PlatformLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditPurchase" ADD CONSTRAINT "PlatformCreditPurchase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlatformTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditPurchase" ADD CONSTRAINT "PlatformCreditPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditPurchase" ADD CONSTRAINT "PlatformCreditPurchase_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditUsage" ADD CONSTRAINT "PlatformCreditUsage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlatformTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditUsage" ADD CONSTRAINT "PlatformCreditUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditUsage" ADD CONSTRAINT "PlatformCreditUsage_energyTransactionId_fkey" FOREIGN KEY ("energyTransactionId") REFERENCES "EnergyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCreditUsage" ADD CONSTRAINT "PlatformCreditUsage_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "PlatformLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
