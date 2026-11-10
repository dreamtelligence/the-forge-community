import assert from 'node:assert/strict';
import {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  signWebhookPayload,
  verifyApiKey,
  verifyWebhookSignature,
} from '../../lib/api-keys/crypto';

// RFC 4231 section 4.3: published HMAC-SHA-256 interoperability vector.
const payload = 'what do ya want for nothing?';
const secret = 'Jefe';
const expected = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';
assert.equal(signWebhookPayload(payload, secret), expected);
assert.equal(verifyWebhookSignature(payload, expected, secret), true);
assert.equal(verifyWebhookSignature(`${payload}!`, expected, secret), false);
assert.equal(verifyWebhookSignature(payload, expected, 'wrong secret'), false);

const { apiKey, keyHash, keyPrefix } = generateApiKey();
assert.equal(isValidApiKeyFormat(apiKey), true);
assert.equal(keyPrefix, apiKey.slice(0, 10));
assert.equal(keyHash, hashApiKey(apiKey));
assert.equal(verifyApiKey(apiKey, keyHash), true);
assert.equal(verifyApiKey('wrong key', keyHash), false);

// Buffer.from(hex) silently truncates malformed suffixes unless rejected first.
for (const suffix of ['z', '00', '\n']) {
  assert.equal(verifyWebhookSignature(payload, `${expected}${suffix}`, secret), false);
  assert.equal(verifyApiKey(apiKey, `${keyHash}${suffix}`), false);
}
for (const malformed of ['', '00', 'g'.repeat(64), expected.slice(1)]) {
  assert.equal(verifyWebhookSignature(payload, malformed, secret), false);
  assert.equal(verifyApiKey(apiKey, malformed), false);
}
console.log('API key crypto tests passed.');
