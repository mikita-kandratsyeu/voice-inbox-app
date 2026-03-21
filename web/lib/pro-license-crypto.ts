import { createHash, randomBytes } from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ALPHABET_LEN = ALPHABET.length;

export function normalizeLicenseKeyInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');
}

export function hashLicenseKey(normalized: string, pepper = ''): string {
  return createHash('sha256')
    .update(pepper + normalized, 'utf8')
    .digest('hex');
}

function randomSegment(len: number): string {
  let out = '';

  const buf = randomBytes(len * 2);
  let pos = 0;

  while (out.length < len) {
    if (pos >= buf.length) {
      buf.set(randomBytes(len * 2));
      pos = 0;
    }
    const byte = buf[pos++]!;
    const threshold = 256 - (256 % ALPHABET_LEN);
    if (byte < threshold) {
      out += ALPHABET[byte % ALPHABET_LEN];
    }
  }
  return out;
}

export function generatePlainLicenseKey(): string {
  return `VI-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}

export function isValidLicenseKeyFormat(raw: string): boolean {
  const normalized = normalizeLicenseKeyInput(raw);
  return /^VI[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(normalized);
}
