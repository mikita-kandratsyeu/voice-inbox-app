import { NextResponse } from 'next/server';

export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const;

export function apiError(message: string, status: number = HttpStatus.BAD_REQUEST) {
  return NextResponse.json({ error: message }, { status });
}

export function validateRequiredString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  return null;
}

export function validateRequiredStrings(
  fields: Array<{ value: unknown; name: string }>,
): string | null {
  for (const { value, name } of fields) {
    const error = validateRequiredString(value, name);

    if (error) {
      return error;
    }
  }

  return null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANDROID_ID_REGEX = /^[0-9a-f]{16}$/i;

export function isValidDeviceId(deviceId: string): boolean {
  const trimmed = deviceId.trim();

  if (trimmed.length < 16 || trimmed.length > 36) {
    return false;
  }

  return UUID_REGEX.test(trimmed) || ANDROID_ID_REGEX.test(trimmed);
}

export function validateDeviceId(deviceId: string | null | undefined): string | null {
  if (!deviceId || typeof deviceId !== 'string') {
    return 'x-device-id header is required';
  }

  const trimmed = deviceId.trim();
  if (!trimmed) {
    return 'x-device-id header is required';
  }

  if (!isValidDeviceId(trimmed)) {
    return 'Invalid x-device-id format (expected UUID or 16-char hex)';
  }

  return null;
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function getAcceptedSecrets(): string[] {
  const primary = process.env.APP_SECRET;
  const legacy = process.env.APP_SECRET_LEGACY;
  const secrets: string[] = [];

  if (primary) secrets.push(primary);

  if (legacy) {
    secrets.push(
      ...legacy
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return secrets;
}

export function requireAppSecret(request: Request): NextResponse | null {
  const secret = request.headers.get('x-app-secret')?.trim();

  if (!secret) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  const accepted = getAcceptedSecrets();
  if (accepted.length === 0) {
    return apiError('Server misconfiguration', HttpStatus.UNAUTHORIZED);
  }

  if (!accepted.includes(secret)) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  return null;
}
