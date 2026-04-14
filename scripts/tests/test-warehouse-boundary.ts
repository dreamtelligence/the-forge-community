#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import {
  CarrierType,
  InventoryTransactionType,
  InboundPackageStatus,
  PickListItemStatus,
  PickListStatus,
  ReturnStatus,
  ShipmentStatus,
  StorageBinType,
} from '@prisma/client';
import {
  parseCarrierTypeParam,
  normalizeWarehouseItemInput,
  parseFulfillmentOrderSourceParam,
  parseFulfillmentOrderStatusParam,
  parseInboundPackageStatusParam,
  parseInventoryTransactionTypeParam,
  parsePickListItemStatusParam,
  parsePickListStatusParam,
  parseReturnStatusParam,
  parseShipmentStatusParam,
  parseStorageBinType,
  parseWarehouseBooleanFlag,
  parseWarehouseQuantity,
  parseWarehouseTake,
  WarehouseImportErrorValidationError,
  WarehouseInboundPackageValidationError,
  WarehouseInventoryValidationError,
  WarehouseItemValidationError,
  WarehouseOrderValidationError,
  WarehousePickListValidationError,
  WarehouseReturnValidationError,
  WarehouseShipmentValidationError,
} from '@/lib/warehouse/contracts';
import {
  WarehouseImportValidationError,
} from '@/lib/warehouse/import';

function expectThrows(fn: () => void, messageIncludes: string) {
  try {
    fn();
    assert.fail(`Expected throw containing "${messageIncludes}"`);
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes(messageIncludes), error.message);
  }
}

function run() {
  const normalized = normalizeWarehouseItemInput({
    sku: '  SKU-1 ',
    name: ' Demo Item ',
    quantityOnHand: 5,
    reservedQuantity: 1,
    reorderLevel: 2,
    defaultBinId: ' BIN-1 ',
  });

  assert.equal(normalized.sku, 'SKU-1');
  assert.equal(normalized.name, 'Demo Item');
  assert.equal(normalized.unit, 'pcs');
  assert.equal(normalized.defaultBinId, 'BIN-1');
  assert.equal(normalized.quantityOnHand, 5);

  expectThrows(
    () => normalizeWarehouseItemInput({ sku: '', name: 'x' }),
    'sku und name sind erforderlich'
  );
  expectThrows(
    () => normalizeWarehouseItemInput({ sku: 'x', name: 'y', quantityOnHand: -1 }),
    'Mengen duerfen nicht negativ sein'
  );

  assert.equal(parseWarehouseTake('400', { fallback: 20, max: 200 }), 200);
  assert.equal(parseWarehouseTake('-5', { fallback: 20, max: 200 }), 1);
  assert.equal(parseWarehouseTake(null, { fallback: 20, max: 200 }), 20);
  assert.equal(parseWarehouseBooleanFlag('true'), true);
  assert.equal(parseWarehouseBooleanFlag('0'), false);
  assert.equal(parseWarehouseQuantity(4.8), 4);
  assert.equal(parseWarehouseQuantity('invalid', { fallback: 3 }), 3);

  assert.equal(parseFulfillmentOrderStatusParam('IMPORTED'), 'IMPORTED');
  assert.equal(parseFulfillmentOrderStatusParam('INVALID'), undefined);
  assert.equal(parseFulfillmentOrderSourceParam('WOOCOMMERCE'), 'WOOCOMMERCE');
  assert.equal(parseFulfillmentOrderSourceParam('INVALID'), undefined);
  assert.equal(parseCarrierTypeParam('DHL'), CarrierType.DHL);
  assert.equal(parseCarrierTypeParam('INVALID'), undefined);
  assert.equal(parseInboundPackageStatusParam('RECEIVED'), InboundPackageStatus.RECEIVED);
  assert.equal(parseInboundPackageStatusParam('INVALID'), undefined);
  assert.equal(parseInventoryTransactionTypeParam('IN'), InventoryTransactionType.IN);
  assert.equal(parseInventoryTransactionTypeParam('INVALID'), undefined);
  assert.equal(parsePickListStatusParam('OPEN'), PickListStatus.OPEN);
  assert.equal(parsePickListStatusParam('INVALID'), undefined);
  assert.equal(parsePickListItemStatusParam('SHORT'), PickListItemStatus.SHORT);
  assert.equal(parsePickListItemStatusParam('INVALID'), undefined);
  assert.equal(parseShipmentStatusParam('DELIVERED'), ShipmentStatus.DELIVERED);
  assert.equal(parseShipmentStatusParam('INVALID'), undefined);
  assert.equal(parseReturnStatusParam('RESTOCKED'), ReturnStatus.RESTOCKED);
  assert.equal(parseReturnStatusParam('INVALID'), undefined);

  assert.equal(parseStorageBinType('PALLET'), StorageBinType.PALLET);
  assert.equal(parseStorageBinType('INVALID'), StorageBinType.SHELF);

  assert.ok(new WarehouseItemValidationError('x') instanceof Error);
  assert.ok(new WarehouseInventoryValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseOrderValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehousePickListValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseInboundPackageValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseReturnValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseShipmentValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseImportErrorValidationError('x', 'y') instanceof Error);
  assert.ok(new WarehouseImportValidationError('x') instanceof Error);

  console.log('Warehouse boundary tests passed.');
}

run();
