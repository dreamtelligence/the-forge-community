-- RLS policies for LagerHub WMS tables

ALTER TABLE "WarehouseLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StorageBin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WarehouseItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboundPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfillmentOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfillmentOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WarehouseImportError" ENABLE ROW LEVEL SECURITY;

-- Make migration reruns idempotent by removing existing policies first.
DROP POLICY IF EXISTS "warehouse_location_select" ON "WarehouseLocation";
DROP POLICY IF EXISTS "warehouse_location_insert" ON "WarehouseLocation";
DROP POLICY IF EXISTS "warehouse_location_update" ON "WarehouseLocation";
DROP POLICY IF EXISTS "warehouse_location_delete" ON "WarehouseLocation";
DROP POLICY IF EXISTS "storage_bin_select" ON "StorageBin";
DROP POLICY IF EXISTS "storage_bin_insert" ON "StorageBin";
DROP POLICY IF EXISTS "storage_bin_update" ON "StorageBin";
DROP POLICY IF EXISTS "storage_bin_delete" ON "StorageBin";
DROP POLICY IF EXISTS "warehouse_item_select" ON "WarehouseItem";
DROP POLICY IF EXISTS "warehouse_item_insert" ON "WarehouseItem";
DROP POLICY IF EXISTS "warehouse_item_update" ON "WarehouseItem";
DROP POLICY IF EXISTS "warehouse_item_delete" ON "WarehouseItem";
DROP POLICY IF EXISTS "inventory_txn_select" ON "InventoryTransaction";
DROP POLICY IF EXISTS "inventory_txn_insert" ON "InventoryTransaction";
DROP POLICY IF EXISTS "inventory_txn_update" ON "InventoryTransaction";
DROP POLICY IF EXISTS "inventory_txn_delete" ON "InventoryTransaction";
DROP POLICY IF EXISTS "customer_account_select" ON "CustomerAccount";
DROP POLICY IF EXISTS "customer_account_insert" ON "CustomerAccount";
DROP POLICY IF EXISTS "customer_account_update" ON "CustomerAccount";
DROP POLICY IF EXISTS "customer_account_delete" ON "CustomerAccount";
DROP POLICY IF EXISTS "inbound_package_select" ON "InboundPackage";
DROP POLICY IF EXISTS "inbound_package_insert" ON "InboundPackage";
DROP POLICY IF EXISTS "inbound_package_update" ON "InboundPackage";
DROP POLICY IF EXISTS "inbound_package_delete" ON "InboundPackage";
DROP POLICY IF EXISTS "fulfillment_order_select" ON "FulfillmentOrder";
DROP POLICY IF EXISTS "fulfillment_order_insert" ON "FulfillmentOrder";
DROP POLICY IF EXISTS "fulfillment_order_update" ON "FulfillmentOrder";
DROP POLICY IF EXISTS "fulfillment_order_delete" ON "FulfillmentOrder";
DROP POLICY IF EXISTS "fulfillment_order_line_select" ON "FulfillmentOrderLine";
DROP POLICY IF EXISTS "fulfillment_order_line_insert" ON "FulfillmentOrderLine";
DROP POLICY IF EXISTS "fulfillment_order_line_update" ON "FulfillmentOrderLine";
DROP POLICY IF EXISTS "fulfillment_order_line_delete" ON "FulfillmentOrderLine";
DROP POLICY IF EXISTS "pick_list_select" ON "PickList";
DROP POLICY IF EXISTS "pick_list_insert" ON "PickList";
DROP POLICY IF EXISTS "pick_list_update" ON "PickList";
DROP POLICY IF EXISTS "pick_list_delete" ON "PickList";
DROP POLICY IF EXISTS "pick_list_item_select" ON "PickListItem";
DROP POLICY IF EXISTS "pick_list_item_insert" ON "PickListItem";
DROP POLICY IF EXISTS "pick_list_item_update" ON "PickListItem";
DROP POLICY IF EXISTS "pick_list_item_delete" ON "PickListItem";
DROP POLICY IF EXISTS "shipment_select" ON "Shipment";
DROP POLICY IF EXISTS "shipment_insert" ON "Shipment";
DROP POLICY IF EXISTS "shipment_update" ON "Shipment";
DROP POLICY IF EXISTS "shipment_delete" ON "Shipment";
DROP POLICY IF EXISTS "return_item_select" ON "ReturnItem";
DROP POLICY IF EXISTS "return_item_insert" ON "ReturnItem";
DROP POLICY IF EXISTS "return_item_update" ON "ReturnItem";
DROP POLICY IF EXISTS "return_item_delete" ON "ReturnItem";
DROP POLICY IF EXISTS "warehouse_import_error_select" ON "WarehouseImportError";
DROP POLICY IF EXISTS "warehouse_import_error_insert" ON "WarehouseImportError";
DROP POLICY IF EXISTS "warehouse_import_error_update" ON "WarehouseImportError";
DROP POLICY IF EXISTS "warehouse_import_error_delete" ON "WarehouseImportError";

-- WarehouseLocation
CREATE POLICY "warehouse_location_select" ON "WarehouseLocation"
  FOR SELECT
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "warehouse_location_insert" ON "WarehouseLocation"
  FOR INSERT
  WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "warehouse_location_update" ON "WarehouseLocation"
  FOR UPDATE
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY "warehouse_location_delete" ON "WarehouseLocation"
  FOR DELETE
  USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- StorageBin
CREATE POLICY "storage_bin_select" ON "StorageBin"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "storage_bin_insert" ON "StorageBin"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "storage_bin_update" ON "StorageBin"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "storage_bin_delete" ON "StorageBin"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- WarehouseItem
CREATE POLICY "warehouse_item_select" ON "WarehouseItem"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_item_insert" ON "WarehouseItem"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_item_update" ON "WarehouseItem"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_item_delete" ON "WarehouseItem"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- InventoryTransaction
CREATE POLICY "inventory_txn_select" ON "InventoryTransaction"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inventory_txn_insert" ON "InventoryTransaction"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inventory_txn_update" ON "InventoryTransaction"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inventory_txn_delete" ON "InventoryTransaction"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- CustomerAccount
CREATE POLICY "customer_account_select" ON "CustomerAccount"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "customer_account_insert" ON "CustomerAccount"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "customer_account_update" ON "CustomerAccount"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "customer_account_delete" ON "CustomerAccount"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- InboundPackage
CREATE POLICY "inbound_package_select" ON "InboundPackage"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inbound_package_insert" ON "InboundPackage"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inbound_package_update" ON "InboundPackage"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "inbound_package_delete" ON "InboundPackage"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- FulfillmentOrder
CREATE POLICY "fulfillment_order_select" ON "FulfillmentOrder"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_insert" ON "FulfillmentOrder"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_update" ON "FulfillmentOrder"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_delete" ON "FulfillmentOrder"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- FulfillmentOrderLine (via parent venture)
CREATE POLICY "fulfillment_order_line_select" ON "FulfillmentOrderLine"
  FOR SELECT USING (
    "orderId" IN (
      SELECT "id" FROM "FulfillmentOrder"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_line_insert" ON "FulfillmentOrderLine"
  FOR INSERT WITH CHECK (
    "orderId" IN (
      SELECT "id" FROM "FulfillmentOrder"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_line_update" ON "FulfillmentOrderLine"
  FOR UPDATE USING (
    "orderId" IN (
      SELECT "id" FROM "FulfillmentOrder"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "fulfillment_order_line_delete" ON "FulfillmentOrderLine"
  FOR DELETE USING (
    "orderId" IN (
      SELECT "id" FROM "FulfillmentOrder"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- PickList
CREATE POLICY "pick_list_select" ON "PickList"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_insert" ON "PickList"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_update" ON "PickList"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_delete" ON "PickList"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- PickListItem (via parent picklist venture)
CREATE POLICY "pick_list_item_select" ON "PickListItem"
  FOR SELECT USING (
    "pickListId" IN (
      SELECT "id" FROM "PickList"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_item_insert" ON "PickListItem"
  FOR INSERT WITH CHECK (
    "pickListId" IN (
      SELECT "id" FROM "PickList"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_item_update" ON "PickListItem"
  FOR UPDATE USING (
    "pickListId" IN (
      SELECT "id" FROM "PickList"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "pick_list_item_delete" ON "PickListItem"
  FOR DELETE USING (
    "pickListId" IN (
      SELECT "id" FROM "PickList"
      WHERE "ventureId" IN (
        SELECT id FROM "Venture"
        WHERE
          "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          OR "squadId" IN (
            SELECT "squadId" FROM "SquadMember"
            WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
            AND "leftAt" IS NULL
          )
      )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- Shipment
CREATE POLICY "shipment_select" ON "Shipment"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "shipment_insert" ON "Shipment"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "shipment_update" ON "Shipment"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "shipment_delete" ON "Shipment"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- ReturnItem
CREATE POLICY "return_item_select" ON "ReturnItem"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "return_item_insert" ON "ReturnItem"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "return_item_update" ON "ReturnItem"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "return_item_delete" ON "ReturnItem"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );

-- WarehouseImportError
CREATE POLICY "warehouse_import_error_select" ON "WarehouseImportError"
  FOR SELECT USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_import_error_insert" ON "WarehouseImportError"
  FOR INSERT WITH CHECK (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_import_error_update" ON "WarehouseImportError"
  FOR UPDATE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
CREATE POLICY "warehouse_import_error_delete" ON "WarehouseImportError"
  FOR DELETE USING (
    "ventureId" IN (
      SELECT id FROM "Venture"
      WHERE
        "ownerId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
        OR "squadId" IN (
          SELECT "squadId" FROM "SquadMember"
          WHERE "userId" IN (SELECT id FROM "User" WHERE email = current_setting('app.current_user_email', true))
          AND "leftAt" IS NULL
        )
    ) OR current_setting('app.is_admin', true) = 'true'
  );
