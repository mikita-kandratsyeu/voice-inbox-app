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

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function requireAppSecret(request: Request): NextResponse | null {
  const secret = request.headers.get('x-app-secret');

  if (secret !== process.env.APP_SECRET) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  return null;
}
