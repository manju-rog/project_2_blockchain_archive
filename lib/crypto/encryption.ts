import CryptoJS from 'crypto-js';

/**
 * Encryption utility using AES-256 for data protection
 */

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  tag?: string;
}

/**
 * Generate a secure key from passphrase using PBKDF2
 */
export function deriveKey(passphrase: string, salt: string): string {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
}

/**
 * Encrypt data using AES-256-CBC
 */
export function encryptData(
  data: string | ArrayBuffer,
  passphrase: string
): EncryptedData {
  // Generate random salt and IV
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  // Derive key from passphrase
  const key = deriveKey(passphrase, salt);

  // Convert data to base64 if ArrayBuffer
  let dataToEncrypt: string;
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    const binary = Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    dataToEncrypt = btoa(binary);
  } else {
    dataToEncrypt = data;
  }

  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return {
    ciphertext: encrypted.toString(),
    iv: iv.toString(),
    salt: salt
  };
}

/**
 * Decrypt data using AES-256-CBC
 */
export function decryptData(
  encryptedData: EncryptedData,
  passphrase: string
): string {
  // Derive key from passphrase and salt
  const key = deriveKey(passphrase, encryptedData.salt);

  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(
    encryptedData.ciphertext,
    key,
    {
      iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt a file chunk
 */
export function encryptChunk(
  chunk: Uint8Array,
  passphrase: string
): EncryptedData {
  return encryptData(chunk.buffer as ArrayBuffer, passphrase);
}

/**
 * Decrypt a file chunk
 */
export function decryptChunk(
  encryptedData: EncryptedData,
  passphrase: string
): Uint8Array {
  const decrypted = decryptData(encryptedData, passphrase);

  // Convert base64 back to ArrayBuffer
  const binary = atob(decrypted);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Generate a cryptographic hash of data
 */
export function hashData(data: string | ArrayBuffer): string {
  let dataToHash: string;

  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    const binary = Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    dataToHash = btoa(binary);
  } else {
    dataToHash = data;
  }

  return CryptoJS.SHA256(dataToHash).toString();
}

/**
 * Generate a random encryption key
 */
export function generateKey(): string {
  return CryptoJS.lib.WordArray.random(256 / 8).toString();
}

/**
 * Generate HMAC for data integrity verification
 */
export function generateHMAC(data: string, key: string): string {
  return CryptoJS.HmacSHA256(data, key).toString();
}

/**
 * Verify HMAC
 */
export function verifyHMAC(data: string, key: string, hmac: string): boolean {
  const computed = generateHMAC(data, key);
  return computed === hmac;
}
