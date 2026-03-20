import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

const LOGIN_MAX = 64;
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;

function validateLogin(login: string): string | null {
  if (login.length < 2 || login.length > LOGIN_MAX) return 'login length 2–64';
  if (!/^[a-zA-Z0-9._@-]+$/.test(login)) return 'login: letters, digits, . _ @ - only';
  return null;
}

function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `password at least ${PASSWORD_MIN} characters`;
  if (pw.length > PASSWORD_MAX) return 'password too long';
  return null;
}

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, login: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      items: users.map((u) => ({
        id: u.id,
        login: u.login,
        createdAt: u.createdAt.toISOString(),
        isCurrent: u.id === admin.adminId,
      })),
    });
  } catch (e) {
    console.error('[admin/users GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PostBody = { login?: unknown; password?: unknown };

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const login = typeof body.login === 'string' ? body.login.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const le = validateLogin(login);
  if (le) return NextResponse.json({ ok: false, error: le }, { status: 400 });
  const pe = validatePassword(password);
  if (pe) return NextResponse.json({ ok: false, error: pe }, { status: 400 });

  try {
    const hash = await bcrypt.hash(password, 12);
    const created = await prisma.adminUser.create({
      data: { login, passwordHash: hash },
      select: { id: true, login: true, createdAt: true },
    });
    await writeAdminAudit(admin, 'admin.user_create', { newLogin: created.login, id: created.id });
    return NextResponse.json({
      ok: true,
      user: {
        id: created.id,
        login: created.login,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Login already exists or create failed' },
      { status: 409 },
    );
  }
}
