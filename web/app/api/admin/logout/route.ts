import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/config/constants';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
