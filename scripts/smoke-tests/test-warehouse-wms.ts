#!/usr/bin/env tsx
/**
 * Warehouse WMS smoke tests for LagerHub endpoints:
 * - WooCommerce order import
 * - Inbound package create/update
 * - Pickup receipt creation
 * - Optional package photo upload/delete
 */

import { fetchBlobForForm, normalizeSessionCookie, safeJsonParse } from './utils';

type TestConfig = {
  ventureId: string;
  apiBaseUrl: string;
  sessionCookie: string;
  testImageUrl?: string;
  enablePhotoUpload: boolean;
};

type TestResult = {
  name: string;
  success: boolean;
  skipped?: boolean;
  durationMs: number;
  error?: string;
};

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function nowStamp() {
  return Date.now();
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const rawText = await response.text();
  const json = safeJsonParse(rawText);
  if (json && isRecord(json)) return json;
  if (rawText) {
    return { rawText };
  }
  return {};
}

async function runStep(
  name: string,
  fn: () => Promise<void>,
  opts?: { skip?: boolean; reason?: string }
): Promise<TestResult> {
  const started = Date.now();
  if (opts?.skip) {
    console.log(`⏭️  ${name} (skipped: ${opts.reason || 'not configured'})`);
    return { name, success: true, skipped: true, durationMs: Date.now() - started };
  }

  try {
    console.log(`🧪 ${name}`);
    await fn();
    console.log(`✅ ${name}`);
    return { name, success: true, durationMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`❌ ${name}: ${message}`);
    return { name, success: false, durationMs: Date.now() - started, error: message };
  }
}

async function runWarehouseSmokeTests(config: TestConfig) {
  const results: TestResult[] = [];
  const stamp = nowStamp();
  const baseHeaders = {
    Cookie: config.sessionCookie,
  };

  const state: {
    packageId?: string;
    uploadedPhotoUrl?: string;
    pickupReceiptNumber?: string;
  } = {};

  const run = async (
    name: string,
    fn: () => Promise<void>,
    opts?: { skip?: boolean; reason?: string }
  ) => {
    const result = await runStep(name, fn, opts);
    results.push(result);
  };

  await run('WooCommerce Import (orders[] payload)', async () => {
    const sourceOrderId = `smoke-woo-${stamp}`;
    const orderNumber = `SMOKE-${String(stamp).slice(-6)}`;
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/orders/import/woocommerce`,
      {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orders: [
            {
              id: sourceOrderId,
              number: orderNumber,
              status: 'processing',
              currency: 'EUR',
              subtotal: '24.90',
              shipping_total: '5.00',
              total: '29.90',
              customer_id: `cust-${stamp}`,
              billing: {
                first_name: 'Smoke',
                last_name: 'Tester',
                email: `smoke+${stamp}@example.com`,
                phone: '+49-000-000000',
              },
              line_items: [
                {
                  id: 1,
                  sku: `SMOKE-SKU-${String(stamp).slice(-4)}`,
                  name: 'Smoke Test Item',
                  quantity: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await parseJsonResponse(response);
    assertCondition(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);

    const total = Number(data.total ?? 0);
    const created = Number(data.created ?? 0);
    const updated = Number(data.updated ?? 0);
    const failed = Number(data.failed ?? 0);
    assertCondition(total === 1, `Expected total=1, got ${total}`);
    assertCondition(created + updated === 1, `Expected created+updated=1, got ${created + updated}`);
    assertCondition(failed === 0, `Expected failed=0, got ${failed}`);
  });

  await run('Inbound Create', async () => {
    const tracking = `SMOKE-TRK-${stamp}`;
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/inbound-packages`,
      {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumber: tracking,
          carrier: 'OTHER',
          notes: 'Warehouse smoke test package',
        }),
      }
    );

    const data = await parseJsonResponse(response);
    assertCondition(response.status === 201, `Expected HTTP 201, got ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(typeof data.id === 'string' && data.id.length > 0, 'Missing package id');
    state.packageId = data.id as string;
    assertCondition(data.status === 'RECEIVED', `Expected status RECEIVED, got ${String(data.status)}`);
  });

  await run(
    'Inbound Photo Upload',
    async () => {
      assertCondition(state.packageId, 'Missing packageId from previous step');
      assertCondition(config.testImageUrl, 'Missing TEST_WAREHOUSE_IMAGE_URL');

      const { blob, filename } = await fetchBlobForForm(config.testImageUrl!, 'warehouse-smoke.jpg');
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      const file = new File([blob], filename, { type: mime });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('retentionDays', '30');

      const response = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/inbound-packages/${state.packageId}/photos`,
        {
          method: 'POST',
          headers: {
            ...baseHeaders,
          },
          body: formData,
        }
      );

      const data = await parseJsonResponse(response);
      assertCondition(response.status === 201, `Expected HTTP 201, got ${response.status}: ${JSON.stringify(data)}`);
      assertCondition(Array.isArray(data.photoUrls) && data.photoUrls.length > 0, 'No photoUrls returned');
      const latest = data.photoUrls[data.photoUrls.length - 1];
      assertCondition(typeof latest === 'string' && latest.startsWith('http'), 'Invalid uploaded photo URL');
      state.uploadedPhotoUrl = latest;
    },
    {
      skip: !config.enablePhotoUpload || !config.testImageUrl,
      reason: 'set TEST_WAREHOUSE_PHOTO_UPLOAD=1 and TEST_WAREHOUSE_IMAGE_URL',
    }
  );

  await run(
    'Inbound Photo Delete',
    async () => {
      assertCondition(state.packageId, 'Missing packageId from previous step');
      assertCondition(state.uploadedPhotoUrl, 'Missing uploaded photo URL from previous step');

      const response = await fetch(
        `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/inbound-packages/${state.packageId}/photos`,
        {
          method: 'DELETE',
          headers: {
            ...baseHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: state.uploadedPhotoUrl,
          }),
        }
      );

      const data = await parseJsonResponse(response);
      assertCondition(response.ok, `Expected HTTP 200, got ${response.status}: ${JSON.stringify(data)}`);
      assertCondition(
        Array.isArray(data.photoUrls) && !data.photoUrls.includes(state.uploadedPhotoUrl),
        'Uploaded photo URL was not removed'
      );
    },
    {
      skip: !state.uploadedPhotoUrl,
      reason: 'photo upload step was skipped or failed',
    }
  );

  await run('Inbound PATCH status -> STORED', async () => {
    assertCondition(state.packageId, 'Missing packageId from previous step');
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/inbound-packages/${state.packageId}`,
      {
        method: 'PATCH',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'STORED',
        }),
      }
    );

    const data = await parseJsonResponse(response);
    assertCondition(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(data.status === 'STORED', `Expected STORED, got ${String(data.status)}`);
  });

  await run('Pickup Receipt Create', async () => {
    assertCondition(state.packageId, 'Missing packageId from previous step');
    const response = await fetch(
      `${config.apiBaseUrl}/api/ventures/${config.ventureId}/warehouse/inbound-packages/${state.packageId}/pickup-receipt`,
      {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientName: 'Smoke Tester',
          recipientDocument: `ID-${String(stamp).slice(-6)}`,
        }),
      }
    );

    const data = await parseJsonResponse(response);
    assertCondition(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);

    const receipt = isRecord(data.receipt) ? data.receipt : null;
    const packageData = isRecord(data.package) ? data.package : null;
    assertCondition(receipt, 'Missing receipt payload');
    assertCondition(packageData, 'Missing package payload');
    assertCondition(typeof receipt.receiptNumber === 'string', 'Missing receiptNumber');
    assertCondition(
      String(receipt.receiptNumber).startsWith('PU-'),
      `Unexpected receiptNumber format: ${String(receipt.receiptNumber)}`
    );
    assertCondition(packageData.status === 'PICKED_UP', `Expected PICKED_UP, got ${String(packageData.status)}`);
    state.pickupReceiptNumber = String(receipt.receiptNumber);
  });

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log('\n──────── Warehouse Smoke Summary ────────');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  if (state.pickupReceiptNumber) {
    console.log(`Receipt: ${state.pickupReceiptNumber}`);
  }
  console.log('─────────────────────────────────────────');

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const ventureId = process.env.TEST_VENTURE_ID || '';
  const sessionCookie = normalizeSessionCookie(process.env.TEST_SESSION_COOKIE || '', apiBaseUrl);
  const enablePhotoUpload = process.env.TEST_WAREHOUSE_PHOTO_UPLOAD === '1';
  const testImageUrl = process.env.TEST_WAREHOUSE_IMAGE_URL;

  if (!ventureId || !sessionCookie) {
    console.error('❌ Missing required environment variables:');
    console.error('   - TEST_VENTURE_ID');
    console.error('   - TEST_SESSION_COOKIE');
    console.error('\nOptional for photo tests:');
    console.error('   - TEST_WAREHOUSE_PHOTO_UPLOAD=1');
    console.error('   - TEST_WAREHOUSE_IMAGE_URL=https://...');
    process.exit(1);
  }

  console.log('Warehouse smoke test configuration:');
  console.log(`- API Base URL: ${apiBaseUrl}`);
  console.log(`- Venture ID: ${ventureId}`);
  console.log(`- Photo Upload Enabled: ${enablePhotoUpload ? 'yes' : 'no'}`);
  if (enablePhotoUpload) {
    console.log(`- Photo URL: ${testImageUrl || '(missing)'}`);
  }
  console.log('');

  await runWarehouseSmokeTests({
    ventureId,
    apiBaseUrl,
    sessionCookie,
    enablePhotoUpload,
    testImageUrl,
  });
}

main().catch((error) => {
  console.error('Fatal error while running warehouse smoke tests:', error);
  process.exit(1);
});
