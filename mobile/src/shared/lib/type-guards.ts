export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/** Non-negative finite number (e.g. ASR segment offsets in ms). */
export function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value) && value >= 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/** Server polling hint progress field (0–100). */
export function isProgressPercent(value: unknown): value is number {
  return isNumber(value) && value >= 0 && value <= 100;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isStringArrayItem(x: unknown): x is string {
  return typeof x === 'string';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}
