-- LagerHub WMS core schema
-- Inventory, inbound packages, fulfillment orders, picklists, shipments, returns

DO $$ BEGIN
  CREATE TYPE "StorageBinType" AS ENUM ('SHELF', 'BOX', 'PALLET', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT', 'ADJUST', 'TRANSFER', 'RESERVE', 'RELEASE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerType" AS ENUM ('PRIVATE', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CarrierType" AS ENUM ('DHL', 'HERMES', 'UPS', 'DPD', 'GLS', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InboundPackageStatus" AS ENUM ('RECEIVED', 'STORED', 'LINKED_TO_ORDER', 'PICKED_UP', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentOrderSource" AS ENUM ('SHOPIFY', 'WOOCOMMERCE', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentOrderStatus" AS ENUM ('IMPORTED', 'READY_TO_PICK', 'PICKING', 'PACKED', 'SHIPPED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentLineStatus" AS ENUM ('OPEN', 'PICKED', 'PACKED', 'SHIPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PickListStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PickListItemStatus" AS ENUM ('PENDING', 'PICKED', 'SHORT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'HANDED_OVER', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnStatus" AS ENUM ('ANNOUNCED', 'RECEIVED', 'INSPECTED', 'RESTOCKED', 'DISPOSED', 'RETURNED_TO_SENDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WarehouseLocation" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "timezone" TEXT DEFAULT 'Europe/Berlin',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StorageBin" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "locationId" TEXT,
  "code" TEXT NOT NULL,
  "label" TEXT,
  "binType" "StorageBinType" NOT NULL DEFAULT 'SHELF',
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorageBin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseItem" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "barcode" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 0,
  "defaultBinId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "binId" TEXT,
  "type" "InventoryTransactionType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "previousQty" INTEGER NOT NULL,
  "newQty" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerAccount" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "type" "CustomerType" NOT NULL DEFAULT 'BUSINESS',
  "name" TEXT NOT NULL,
  "companyName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "externalRef" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboundPackage" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "customerId" TEXT,
  "linkedOrderId" TEXT,
  "carrier" "CarrierType" NOT NULL DEFAULT 'OTHER',
  "trackingNumber" TEXT,
  "externalReference" TEXT,
  "status" "InboundPackageStatus" NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "storedAt" TIMESTAMP(3),
  "pickedUpAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "photoRetentionUntil" TIMESTAMP(3),
  "notes" TEXT,
  "handledById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FulfillmentOrder" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "source" "FulfillmentOrderSource" NOT NULL DEFAULT 'MANUAL',
  "sourceOrderId" TEXT,
  "customerId" TEXT,
  "status" "FulfillmentOrderStatus" NOT NULL DEFAULT 'IMPORTED',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "subtotal" DOUBLE PRECISION,
  "shippingCost" DOUBLE PRECISION,
  "totalAmount" DOUBLE PRECISION,
  "notes" TEXT,
  "importPayload" JSONB,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pickedAt" TIMESTAMP(3),
  "packedAt" TIMESTAMP(3),
  "shippedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FulfillmentOrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "itemId" TEXT,
  "sku" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
  "packedQuantity" INTEGER NOT NULL DEFAULT 0,
  "status" "FulfillmentLineStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FulfillmentOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PickList" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "orderId" TEXT,
  "status" "PickListStatus" NOT NULL DEFAULT 'OPEN',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PickListItem" (
  "id" TEXT NOT NULL,
  "pickListId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "targetQty" INTEGER NOT NULL,
  "pickedQty" INTEGER NOT NULL DEFAULT 0,
  "status" "PickListItemStatus" NOT NULL DEFAULT 'PENDING',
  "binCodeSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "carrier" "CarrierType" NOT NULL DEFAULT 'OTHER',
  "trackingNumber" TEXT,
  "labelUrl" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReturnItem" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "orderId" TEXT,
  "orderLineId" TEXT,
  "status" "ReturnStatus" NOT NULL DEFAULT 'ANNOUNCED',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "reason" TEXT,
  "conditionNote" TEXT,
  "receivedAt" TIMESTAMP(3),
  "inspectedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "handledById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseImportError" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "provider" "FulfillmentOrderSource" NOT NULL,
  "sourceEntity" TEXT NOT NULL,
  "sourceEntityId" TEXT,
  "payload" JSONB,
  "errorMessage" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseImportError_pkey" PRIMARY KEY ("id")
);

-- Make migration reruns idempotent by removing existing FK constraints first.
ALTER TABLE "WarehouseLocation" DROP CONSTRAINT IF EXISTS "WarehouseLocation_ventureId_fkey";

ALTER TABLE "StorageBin" DROP CONSTRAINT IF EXISTS "StorageBin_ventureId_fkey";
ALTER TABLE "StorageBin" DROP CONSTRAINT IF EXISTS "StorageBin_locationId_fkey";

ALTER TABLE "WarehouseItem" DROP CONSTRAINT IF EXISTS "WarehouseItem_ventureId_fkey";
ALTER TABLE "WarehouseItem" DROP CONSTRAINT IF EXISTS "WarehouseItem_defaultBinId_fkey";
ALTER TABLE "WarehouseItem" DROP CONSTRAINT IF EXISTS "WarehouseItem_createdById_fkey";

ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_ventureId_fkey";
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_itemId_fkey";
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_binId_fkey";
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT IF EXISTS "InventoryTransaction_createdById_fkey";

ALTER TABLE "CustomerAccount" DROP CONSTRAINT IF EXISTS "CustomerAccount_ventureId_fkey";

ALTER TABLE "InboundPackage" DROP CONSTRAINT IF EXISTS "InboundPackage_ventureId_fkey";
ALTER TABLE "InboundPackage" DROP CONSTRAINT IF EXISTS "InboundPackage_customerId_fkey";
ALTER TABLE "InboundPackage" DROP CONSTRAINT IF EXISTS "InboundPackage_linkedOrderId_fkey";
ALTER TABLE "InboundPackage" DROP CONSTRAINT IF EXISTS "InboundPackage_handledById_fkey";

ALTER TABLE "FulfillmentOrder" DROP CONSTRAINT IF EXISTS "FulfillmentOrder_ventureId_fkey";
ALTER TABLE "FulfillmentOrder" DROP CONSTRAINT IF EXISTS "FulfillmentOrder_customerId_fkey";
ALTER TABLE "FulfillmentOrder" DROP CONSTRAINT IF EXISTS "FulfillmentOrder_createdById_fkey";

ALTER TABLE "FulfillmentOrderLine" DROP CONSTRAINT IF EXISTS "FulfillmentOrderLine_orderId_fkey";
ALTER TABLE "FulfillmentOrderLine" DROP CONSTRAINT IF EXISTS "FulfillmentOrderLine_itemId_fkey";

ALTER TABLE "PickList" DROP CONSTRAINT IF EXISTS "PickList_ventureId_fkey";
ALTER TABLE "PickList" DROP CONSTRAINT IF EXISTS "PickList_orderId_fkey";
ALTER TABLE "PickList" DROP CONSTRAINT IF EXISTS "PickList_assignedToId_fkey";

ALTER TABLE "PickListItem" DROP CONSTRAINT IF EXISTS "PickListItem_pickListId_fkey";
ALTER TABLE "PickListItem" DROP CONSTRAINT IF EXISTS "PickListItem_orderLineId_fkey";

ALTER TABLE "Shipment" DROP CONSTRAINT IF EXISTS "Shipment_ventureId_fkey";
ALTER TABLE "Shipment" DROP CONSTRAINT IF EXISTS "Shipment_orderId_fkey";
ALTER TABLE "Shipment" DROP CONSTRAINT IF EXISTS "Shipment_createdById_fkey";

ALTER TABLE "ReturnItem" DROP CONSTRAINT IF EXISTS "ReturnItem_ventureId_fkey";
ALTER TABLE "ReturnItem" DROP CONSTRAINT IF EXISTS "ReturnItem_orderId_fkey";
ALTER TABLE "ReturnItem" DROP CONSTRAINT IF EXISTS "ReturnItem_orderLineId_fkey";
ALTER TABLE "ReturnItem" DROP CONSTRAINT IF EXISTS "ReturnItem_handledById_fkey";

ALTER TABLE "WarehouseImportError" DROP CONSTRAINT IF EXISTS "WarehouseImportError_ventureId_fkey";

ALTER TABLE "WarehouseLocation"
  ADD CONSTRAINT "WarehouseLocation_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorageBin"
  ADD CONSTRAINT "StorageBin_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageBin"
  ADD CONSTRAINT "StorageBin_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseItem"
  ADD CONSTRAINT "WarehouseItem_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseItem"
  ADD CONSTRAINT "WarehouseItem_defaultBinId_fkey" FOREIGN KEY ("defaultBinId") REFERENCES "StorageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseItem"
  ADD CONSTRAINT "WarehouseItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WarehouseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerAccount"
  ADD CONSTRAINT "CustomerAccount_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboundPackage"
  ADD CONSTRAINT "InboundPackage_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundPackage"
  ADD CONSTRAINT "InboundPackage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundPackage"
  ADD CONSTRAINT "InboundPackage_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundPackage"
  ADD CONSTRAINT "InboundPackage_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FulfillmentOrder"
  ADD CONSTRAINT "FulfillmentOrder_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrder"
  ADD CONSTRAINT "FulfillmentOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrder"
  ADD CONSTRAINT "FulfillmentOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FulfillmentOrderLine"
  ADD CONSTRAINT "FulfillmentOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrderLine"
  ADD CONSTRAINT "FulfillmentOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WarehouseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PickList"
  ADD CONSTRAINT "PickList_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickList"
  ADD CONSTRAINT "PickList_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FulfillmentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PickList"
  ADD CONSTRAINT "PickList_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PickListItem"
  ADD CONSTRAINT "PickListItem_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "PickList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickListItem"
  ADD CONSTRAINT "PickListItem_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "FulfillmentOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FulfillmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReturnItem"
  ADD CONSTRAINT "ReturnItem_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnItem"
  ADD CONSTRAINT "ReturnItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "FulfillmentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnItem"
  ADD CONSTRAINT "ReturnItem_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "FulfillmentOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnItem"
  ADD CONSTRAINT "ReturnItem_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseImportError"
  ADD CONSTRAINT "WarehouseImportError_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_ventureId_code_key" ON "WarehouseLocation"("ventureId", "code");
CREATE INDEX IF NOT EXISTS "WarehouseLocation_ventureId_idx" ON "WarehouseLocation"("ventureId");

CREATE UNIQUE INDEX IF NOT EXISTS "StorageBin_ventureId_code_key" ON "StorageBin"("ventureId", "code");
CREATE INDEX IF NOT EXISTS "StorageBin_ventureId_idx" ON "StorageBin"("ventureId");
CREATE INDEX IF NOT EXISTS "StorageBin_locationId_idx" ON "StorageBin"("locationId");

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseItem_ventureId_sku_key" ON "WarehouseItem"("ventureId", "sku");
CREATE INDEX IF NOT EXISTS "WarehouseItem_ventureId_idx" ON "WarehouseItem"("ventureId");
CREATE INDEX IF NOT EXISTS "WarehouseItem_barcode_idx" ON "WarehouseItem"("barcode");

CREATE INDEX IF NOT EXISTS "InventoryTransaction_ventureId_idx" ON "InventoryTransaction"("ventureId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

CREATE INDEX IF NOT EXISTS "CustomerAccount_ventureId_idx" ON "CustomerAccount"("ventureId");
CREATE INDEX IF NOT EXISTS "CustomerAccount_externalRef_idx" ON "CustomerAccount"("externalRef");

CREATE INDEX IF NOT EXISTS "InboundPackage_ventureId_idx" ON "InboundPackage"("ventureId");
CREATE INDEX IF NOT EXISTS "InboundPackage_customerId_idx" ON "InboundPackage"("customerId");
CREATE INDEX IF NOT EXISTS "InboundPackage_linkedOrderId_idx" ON "InboundPackage"("linkedOrderId");
CREATE INDEX IF NOT EXISTS "InboundPackage_status_idx" ON "InboundPackage"("status");
CREATE INDEX IF NOT EXISTS "InboundPackage_trackingNumber_idx" ON "InboundPackage"("trackingNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "FulfillmentOrder_ventureId_orderNumber_key" ON "FulfillmentOrder"("ventureId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "FulfillmentOrder_ventureId_source_sourceOrderId_key" ON "FulfillmentOrder"("ventureId", "source", "sourceOrderId");
CREATE INDEX IF NOT EXISTS "FulfillmentOrder_ventureId_idx" ON "FulfillmentOrder"("ventureId");
CREATE INDEX IF NOT EXISTS "FulfillmentOrder_status_idx" ON "FulfillmentOrder"("status");
CREATE INDEX IF NOT EXISTS "FulfillmentOrder_customerId_idx" ON "FulfillmentOrder"("customerId");

CREATE INDEX IF NOT EXISTS "FulfillmentOrderLine_orderId_idx" ON "FulfillmentOrderLine"("orderId");
CREATE INDEX IF NOT EXISTS "FulfillmentOrderLine_itemId_idx" ON "FulfillmentOrderLine"("itemId");
CREATE INDEX IF NOT EXISTS "FulfillmentOrderLine_status_idx" ON "FulfillmentOrderLine"("status");

CREATE INDEX IF NOT EXISTS "PickList_ventureId_idx" ON "PickList"("ventureId");
CREATE INDEX IF NOT EXISTS "PickList_orderId_idx" ON "PickList"("orderId");
CREATE INDEX IF NOT EXISTS "PickList_status_idx" ON "PickList"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "PickListItem_pickListId_orderLineId_key" ON "PickListItem"("pickListId", "orderLineId");
CREATE INDEX IF NOT EXISTS "PickListItem_status_idx" ON "PickListItem"("status");

CREATE INDEX IF NOT EXISTS "Shipment_ventureId_idx" ON "Shipment"("ventureId");
CREATE INDEX IF NOT EXISTS "Shipment_orderId_idx" ON "Shipment"("orderId");
CREATE INDEX IF NOT EXISTS "Shipment_status_idx" ON "Shipment"("status");
CREATE INDEX IF NOT EXISTS "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

CREATE INDEX IF NOT EXISTS "ReturnItem_ventureId_idx" ON "ReturnItem"("ventureId");
CREATE INDEX IF NOT EXISTS "ReturnItem_orderId_idx" ON "ReturnItem"("orderId");
CREATE INDEX IF NOT EXISTS "ReturnItem_status_idx" ON "ReturnItem"("status");

CREATE INDEX IF NOT EXISTS "WarehouseImportError_ventureId_provider_idx" ON "WarehouseImportError"("ventureId", "provider");
CREATE INDEX IF NOT EXISTS "WarehouseImportError_resolvedAt_idx" ON "WarehouseImportError"("resolvedAt");
CREATE INDEX IF NOT EXISTS "WarehouseImportError_createdAt_idx" ON "WarehouseImportError"("createdAt");
