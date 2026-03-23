import QuickCrypto from 'react-native-quick-crypto';

const VERSION_PREFIX = 'v1';
const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const DIGEST = 'sha256';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function parseByteList(part: string): Uint8Array | null {
  if (!part.includes(',')) return null;
  const numbers = part
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 255);

  if (numbers.length === 0) return null;
  return Uint8Array.from(numbers);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function legacyHashPin(pin: string): string {
  let hash = 0;

  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return `pin_${Math.abs(hash).toString(36)}`;
}

function parseStoredPinHash(stored: string): { salt: Uint8Array; expected: Uint8Array } | null {
  if (!stored.startsWith(`${VERSION_PREFIX}$`)) {
    return null;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) {
    return null;
  }

  try {
    let salt: Uint8Array = base64ToBytes(parts[1]);
    let expected: Uint8Array = base64ToBytes(parts[2]);

    if (salt.length !== SALT_BYTES) {
      const parsed = parseByteList(parts[1]);
      if (parsed) {
        salt = parsed;
      }
    }
    if (expected.length !== KEY_BYTES) {
      const parsed = parseByteList(parts[2]);
      if (parsed) {
        expected = parsed;
      }
    }

    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) {
      return null;
    }
    return { salt, expected };
  } catch {
    return null;
  }
}

export function hashPin(pin: string): string {
  const salt = QuickCrypto.randomBytes(SALT_BYTES);
  const derived = QuickCrypto.pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, KEY_BYTES, DIGEST);
  return `${VERSION_PREFIX}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export function verifyPinHash(stored: string, pin: string): boolean {
  const parsed = parseStoredPinHash(stored);
  if (parsed) {
    const derived = QuickCrypto.pbkdf2Sync(pin, parsed.salt, PBKDF2_ITERATIONS, KEY_BYTES, DIGEST);
    return QuickCrypto.timingSafeEqual(derived, parsed.expected);
  }

  return legacyHashPin(pin) === stored;
}

export function needsPinHashMigration(stored: string): boolean {
  if (!stored.startsWith(`${VERSION_PREFIX}$`)) {
    return true;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) {
    return true;
  }

  return parts[1].includes(',') || parts[2].includes(',');
}
