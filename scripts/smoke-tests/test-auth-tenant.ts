#!/usr/bin/env tsx
/**
 * Auth + Tenant smoke checks:
 * - ST-02: Venture exists/creates and is accessible for session user
 * - ST-03: Cross-tenant access denied (requires optional user B inputs)
 */

import { normalizeSessionCookie, safeJsonParse } from './utils';

type TestResult = {
  name: string;
  success: boolean;
  skipped?: boolean;
  durationMs: number;
  error?: string;
};

type Config = {
  apiBaseUrl: string;
  cookieA: string;
  cookieB?: string;
  ventureBId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const rawText = await response.text();
  const json = safeJsonParse(rawText);
  if (json && isRecord(json)) return json;
  if (rawText) return { rawText };
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

async function runAuthTenantSmoke(config: Config) {
  const results: TestResult[] = [];
  let ventureAId = '';

  const run = async (
    name: string,
    fn: () => Promise<void>,
    opts?: { skip?: boolean; reason?: string }
  ) => {
    const result = await runStep(name, fn, opts);
    results.push(result);
  };

  await run('ST-02 /api/forum/venture create-or-get', async () => {
    const first = await fetch(`${config.apiBaseUrl}/api/forum/venture`, {
      method: 'GET',
      headers: { Cookie: config.cookieA },
    });
    const firstData = await parseJsonResponse(first);
    assertCondition(first.ok, `HTTP ${first.status}: ${JSON.stringify(firstData)}`);
    assertCondition(typeof firstData.id === 'string' && firstData.id.length > 0, 'Missing venture id in first call');
    ventureAId = String(firstData.id);

    const second = await fetch(`${config.apiBaseUrl}/api/forum/venture`, {
      method: 'GET',
      headers: { Cookie: config.cookieA },
    });
    const secondData = await parseJsonResponse(second);
    assertCondition(second.ok, `HTTP ${second.status}: ${JSON.stringify(secondData)}`);
    assertCondition(
      typeof secondData.id === 'string' && secondData.id === ventureAId,
      `Expected same venture id on second call, got ${String(secondData.id)}`
    );
  });

  await run('ST-02 owner access to own venture route', async () => {
    assertCondition(ventureAId, 'Missing ventureAId from previous step');
    const response = await fetch(`${config.apiBaseUrl}/api/ventures/${ventureAId}/warehouse/items`, {
      method: 'GET',
      headers: { Cookie: config.cookieA },
    });
    const data = await parseJsonResponse(response);
    assertCondition(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);
    assertCondition(Array.isArray(data), 'Expected JSON array response');
  });

  await run(
    'ST-03 user A blocked from venture B',
    async () => {
      assertCondition(config.ventureBId, 'Missing ventureBId');
      const response = await fetch(`${config.apiBaseUrl}/api/ventures/${config.ventureBId}/warehouse/items`, {
        method: 'GET',
        headers: { Cookie: config.cookieA },
      });
      const data = await parseJsonResponse(response);
      assertCondition(response.status === 404, `Expected 404, got ${response.status}: ${JSON.stringify(data)}`);
    },
    {
      skip: !config.ventureBId,
      reason: 'set TEST_TENANT_VENTURE_B_ID',
    }
  );

  await run(
    'ST-03 user B can access own venture B',
    async () => {
      assertCondition(config.cookieB, 'Missing cookieB');
      assertCondition(config.ventureBId, 'Missing ventureBId');

      const response = await fetch(`${config.apiBaseUrl}/api/ventures/${config.ventureBId}/warehouse/items`, {
        method: 'GET',
        headers: { Cookie: config.cookieB },
      });
      const data = await parseJsonResponse(response);
      assertCondition(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);
      assertCondition(Array.isArray(data), 'Expected JSON array response');
    },
    {
      skip: !config.cookieB || !config.ventureBId,
      reason: 'set TEST_TENANT_SESSION_COOKIE_B and TEST_TENANT_VENTURE_B_ID',
    }
  );

  await run(
    'ST-03 user B blocked from venture A',
    async () => {
      assertCondition(config.cookieB, 'Missing cookieB');
      assertCondition(ventureAId, 'Missing ventureAId');

      const response = await fetch(`${config.apiBaseUrl}/api/ventures/${ventureAId}/warehouse/items`, {
        method: 'GET',
        headers: { Cookie: config.cookieB },
      });
      const data = await parseJsonResponse(response);
      assertCondition(response.status === 404, `Expected 404, got ${response.status}: ${JSON.stringify(data)}`);
    },
    {
      skip: !config.cookieB,
      reason: 'set TEST_TENANT_SESSION_COOKIE_B',
    }
  );

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log('\n──────── Auth/Tenant Smoke Summary ────────');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  if (ventureAId) {
    console.log(`Venture A: ${ventureAId}`);
  }
  if (config.ventureBId) {
    console.log(`Venture B: ${config.ventureBId}`);
  }
  console.log('────────────────────────────────────────────');

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const cookieA = normalizeSessionCookie(process.env.TEST_SESSION_COOKIE || '', apiBaseUrl);
  const cookieBRaw = process.env.TEST_TENANT_SESSION_COOKIE_B || '';
  const cookieB = cookieBRaw ? normalizeSessionCookie(cookieBRaw, apiBaseUrl) : '';
  const ventureBId = String(process.env.TEST_TENANT_VENTURE_B_ID || '').trim();

  if (!cookieA) {
    console.error('❌ Missing required environment variable: TEST_SESSION_COOKIE');
    console.error('Optional for full tenant checks:');
    console.error('   - TEST_TENANT_SESSION_COOKIE_B');
    console.error('   - TEST_TENANT_VENTURE_B_ID');
    process.exit(1);
  }

  console.log('Auth/Tenant smoke test configuration:');
  console.log(`- API Base URL: ${apiBaseUrl}`);
  console.log(`- User B Cookie Provided: ${cookieB ? 'yes' : 'no'}`);
  console.log(`- Venture B Provided: ${ventureBId ? 'yes' : 'no'}`);
  console.log('');

  await runAuthTenantSmoke({
    apiBaseUrl,
    cookieA,
    cookieB: cookieB || undefined,
    ventureBId: ventureBId || undefined,
  });
}

main().catch((error) => {
  console.error('Fatal error while running auth/tenant smoke tests:', error);
  process.exit(1);
});
