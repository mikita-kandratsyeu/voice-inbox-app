import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { signAdminSessionToken } from '@/lib/admin-jwt';
import { prisma } from '@/lib/prisma';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { error: 'Admin not configured (set DATABASE_URL and seed an admin user)' },
      { status: 503 },
    );
  }

  let body: { login?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const loginRaw = typeof body.login === 'string' ? body.login.trim() : '';
  const passwordRaw = typeof body.password === 'string' ? body.password : '';
  const passwordTrimmed = passwordRaw.trim();

  if (!loginRaw) {
    return NextResponse.json({ error: 'Login required' }, { status: 400 });
  }
  if (!passwordTrimmed) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.adminUser.findUnique({ where: { login: loginRaw } });
  } catch (e) {
    console.error('[admin/login]', e);
    return NextResponse.json({ error: 'Database error' }, { status: 503 });
  }

  if (!user || !(await bcrypt.compare(passwordTrimmed, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid login or password' }, { status: 401 });
  }

  let token: string;
  try {
    token = await signAdminSessionToken(user.id, user.login);
  } catch (e) {
    console.error('[admin/login] JWT', e);
    return NextResponse.json(
      { error: 'Server misconfigured (set ADMIN_JWT_SECRET or JWT_SECRET, min 32 chars)' },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, cookieOptions());
  return res;
}
