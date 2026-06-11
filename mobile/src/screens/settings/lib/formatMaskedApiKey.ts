const MASK_CHAR = '•';
const TAIL_VISIBLE = 4;
const MIN_BULLETS = 8;
const MAX_BULLETS = 16;

function resolveVisiblePrefix(key: string): string {
  const dashIndexes: number[] = [];
  for (let index = 0; index < key.length; index += 1) {
    if (key[index] === '-') dashIndexes.push(index);
  }

  if (dashIndexes.length >= 2 && dashIndexes[1]! <= 12) {
    return key.slice(0, dashIndexes[1]! + 1);
  }
  if (dashIndexes.length >= 1 && dashIndexes[0]! <= 8) {
    return key.slice(0, dashIndexes[0]! + 1);
  }

  return key.slice(0, Math.min(3, key.length - TAIL_VISIBLE - 1));
}

/** Masked display for saved API keys (prefix + bullets + last 4 chars). */
export function formatMaskedApiKey(apiKey: string): string {
  const key = apiKey.trim();
  if (!key) return '';

  if (key.length <= TAIL_VISIBLE + 1) {
    return MASK_CHAR.repeat(key.length);
  }

  const tail = key.slice(-TAIL_VISIBLE);
  const prefix = resolveVisiblePrefix(key);
  const bulletCount = Math.min(
    MAX_BULLETS,
    Math.max(MIN_BULLETS, key.length - prefix.length - TAIL_VISIBLE),
  );

  return `${prefix}${MASK_CHAR.repeat(bulletCount)}${tail}`;
}
