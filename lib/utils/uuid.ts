/**
 * UUID Generator (Edge Runtime Compatible)
 *
 * Uses Web Crypto API instead of Node.js crypto module.
 * Works in both Node.js and Edge runtimes.
 */

/**
 * Generate a random UUID v4
 *
 * Edge-compatible alternative to Node.js crypto.randomUUID()
 *
 * @returns UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  // Check if Web Crypto API is available (Edge Runtime, modern browsers)
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Fallback for older environments (should never happen in Vercel)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
