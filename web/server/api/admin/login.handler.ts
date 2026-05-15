import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { getAdminCookieMaxAgeSeconds } from '@/lib/admin-cookie-max-age';
import { signAdminSessionToken } from '@/lib/admin-jwt';
import { apiError, HttpStatus } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { adminLoginBodySchema } from '@/server/api/schemas/admin-login.schema';
import { zodValidationErrorResponse } from '@/server/api/schemas/zod-api-error';

const PATH = '/api/admin/login';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: getAdminCookieMaxAgeSeconds(),
  };
}

export async function postAdminLogin(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return apiError(
      'Admin not configured (set DATABASE_URL and seed an admin user)',
      HttpStatus.SERVICE_UNAVAILABLE,
      { pathname: PATH, code: ApiErrorCode.AdminNotConfigured },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST, {
      pathname: PATH,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const parsed = adminLoginBodySchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationErrorResponse(PATH, parsed.error);
  }

  const { login: loginRaw, password: passwordTrimmed } = parsed.data;

  let user;
  try {
    user = await prisma.adminUser.findUnique({ where: { login: loginRaw } });
  } catch (e) {
    console.error('[admin/login]', e);
    return apiError('Database error', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: PATH,
      code: ApiErrorCode.AdminDatabaseError,
    });
  }

  if (!user || !(await bcrypt.compare(passwordTrimmed, user.passwordHash))) {
    return apiError('Invalid login or password', HttpStatus.UNAUTHORIZED, {
      pathname: PATH,
      code: ApiErrorCode.AdminInvalidCredentials,
    });
  }

  let token: string;
  try {
    token = await signAdminSessionToken(user.id, user.login);
  } catch (e) {
    console.error('[admin/login] JWT', e);
    return apiError(
      'Server misconfigured (set ADMIN_JWT_SECRET or JWT_SECRET, min 32 chars)',
      HttpStatus.SERVICE_UNAVAILABLE,
      { pathname: PATH, code: ApiErrorCode.AdminJwtMisconfigured },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, cookieOptions());
  return res;
}
