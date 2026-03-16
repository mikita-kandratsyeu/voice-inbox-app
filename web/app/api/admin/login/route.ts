import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/config/constants';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: Request): Promise<NextResponse> {
  if (!ADMIN_SECRET?.trim()) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, ADMIN_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
