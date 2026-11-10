import assert from 'node:assert/strict';
import { POST } from '../../app/api/v1/media/generate-image/route';

async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Unavailable external API must not make network requests');
  };
  try {
    const response = await POST();
    assert.equal(response.status, 501);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.error.code, 'NOT_IMPLEMENTED');
    assert.equal('data' in body, false);
    assert.equal('creditsUsed' in body, false);
    console.log('External API availability test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
