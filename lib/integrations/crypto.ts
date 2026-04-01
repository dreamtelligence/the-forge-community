/**
 * Integration Token Encryption Service
 *
 * Enterprise-grade encryption for OAuth tokens at rest.
 * Uses AES-256-GCM for authenticated encryption.
 *
 * Security Features:
 * - AES-256-GCM (authenticated encryption)
 * - Random IV for each encryption
 * - Separate auth tag for integrity verification
 * - Key rotation support via versioning
 *
 * @author Claude Code
 * @version 1.0.0
 */

import crypto from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Encryption key from environment (must be 32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY not configured. ' +
      'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // If key is not exactly 32 bytes, hash it to get proper length
  if (key.length !== KEY_LENGTH) {
    return crypto.createHash('sha256').update(key).digest();
  }
  
  return Buffer.from(key);
};

// Ensure key is available
let ENCRYPTION_KEY: Buffer;
try {
  ENCRYPTION_KEY = getEncryptionKey();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    throw new Error(`[Integration Crypto] ${message}`);
  }

  console.error('[Integration Crypto] Warning:', message);
  // Fallback for local development only
  ENCRYPTION_KEY = crypto.createHash('sha256').update('dev-key-do-not-use-in-production').digest();
}

export interface EncryptedToken {
  encrypted: string;      // Base64 encoded encrypted data
  iv: string;            // Base64 encoded IV
  authTag: string;       // Base64 encoded auth tag
  version: number;       // Encryption version for key rotation
}

/**
 * Encrypt an OAuth token
 * 
 * @param token The plaintext token to encrypt
 * @returns EncryptedToken object with all components
 */
export function encryptToken(token: string): EncryptedToken {
  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    // Encrypt
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 1, // For future key rotation
    };
  } catch (error) {
    console.error('[Integration Crypto] Encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt an OAuth token
 * 
 * @param encryptedData The EncryptedToken object
 * @returns The decrypted plaintext token
 */
export function decryptToken(encryptedData: EncryptedToken): string {
  try {
    // Validate version (for future key rotation)
    if (encryptedData.version !== 1) {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }
    
    // Decode components
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Integration Crypto] Decryption failed:', error);
    throw new Error('Failed to decrypt token - token may be corrupted or key mismatch');
  }
}

/**
 * Serialize encrypted token to string for database storage
 * Format: version:iv:authTag:encrypted (all base64)
 */
export function serializeEncryptedToken(data: EncryptedToken): string {
  return [
    data.version,
    data.iv,
    data.authTag,
    data.encrypted,
  ].join(':');
}

/**
 * Deserialize encrypted token from database string
 */
export function deserializeEncryptedToken(serialized: string): EncryptedToken {
  const parts = serialized.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format');
  }
  
  return {
    version: parseInt(parts[0], 10),
    iv: parts[1],
    authTag: parts[2],
    encrypted: parts[3],
  };
}

/**
 * Convenience function: Encrypt and serialize in one step
 */
export function encryptAndSerialize(token: string): string {
  const encrypted = encryptToken(token);
  return serializeEncryptedToken(encrypted);
}

/**
 * Convenience function: Deserialize and decrypt in one step
 */
export function deserializeAndDecrypt(serialized: string): string {
  const encrypted = deserializeEncryptedToken(serialized);
  return decryptToken(encrypted);
}

/**
 * Generate a secure random key for setup
 * Run this once and set the output as INTEGRATION_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// Export for testing
export const _test = {
  ENCRYPTION_KEY,
  ALGORITHM,
};
