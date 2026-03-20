import QuickCrypto from 'react-native-quick-crypto';

const VERSION_PREFIX = 'v1';
const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const DIGEST = 'sha256';

function legacyHashPin(pin: string): string {
  let hash = 0;

  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return `pin_${Math.abs(hash).toString(36)}`;
}

function parseStoredPinHash(stored: string): { salt: Buffer; expected: Buffer } | null {
  if (!stored.startsWith(`${VERSION_PREFIX}$`)) {
    return null;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
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
  return `${VERSION_PREFIX}$${salt.toString('base64')}$${derived.toString('base64')}`;
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
  return !stored.startsWith(`${VERSION_PREFIX}$`);
}
