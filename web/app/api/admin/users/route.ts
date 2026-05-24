import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { getAdminAccessProfileFromRequestCookie } from '@/lib/admin-auth';
import { writeAdminAudit } from '@/lib/admin-audit';
import { normalizeAdminPermissions, type AdminPermission } from '@/lib/admin-permissions';
import { assertCanManageAdminUsers, sanitizePermissionsForGrant } from '@/lib/admin-user-mutations';
import { prisma } from '@/lib/prisma';
import { isValidTelegramUserIdString } from '@/lib/telegram-admin-whitelist';

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

  const actor = await getAdminAccessProfileFromRequestCookie();
  if (!actor) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const forbidden = assertCanManageAdminUsers(actor);
  if (forbidden) {
    return NextResponse.json({ ok: false, error: forbidden }, { status: 403 });
  }

  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        login: true,
        createdAt: true,
        isSuperadmin: true,
        permissions: true,
        telegramUserId: true,
      },
    });
    return NextResponse.json({
      ok: true,
      actor: {
        isSuperadmin: actor.isSuperadmin,
        grantablePermissions: actor.isSuperadmin
          ? null
          : normalizeAdminPermissions(actor.permissions),
      },
      items: users.map((u) => ({
        id: u.id,
        login: u.login,
        createdAt: u.createdAt.toISOString(),
        isSuperadmin: u.isSuperadmin,
        permissions: normalizeAdminPermissions(u.permissions) as AdminPermission[],
        telegramUserId: u.telegramUserId,
        isCurrent: u.id === actor.adminId,
      })),
    });
  } catch (e) {
    console.error('[admin/users GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PostBody = {
  login?: unknown;
  password?: unknown;
  permissions?: unknown;
  isSuperadmin?: unknown;
  telegramUserId?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const actor = await getAdminAccessProfileFromRequestCookie();
  if (!actor) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const forbidden = assertCanManageAdminUsers(actor);
  if (forbidden) {
    return NextResponse.json({ ok: false, error: forbidden }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const login = typeof body.login === 'string' ? body.login.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const requestedSuperadmin = body.isSuperadmin === true;
  const requestedPermissions = normalizeAdminPermissions(body.permissions);

  const le = validateLogin(login);
  if (le) return NextResponse.json({ ok: false, error: le }, { status: 400 });
  const pe = validatePassword(password);
  if (pe) return NextResponse.json({ ok: false, error: pe }, { status: 400 });

  const sanitized = sanitizePermissionsForGrant(actor, requestedPermissions, requestedSuperadmin);
  if (!sanitized.ok) {
    return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });
  }

  let telegramUserId: string | null = null;
  if (body.telegramUserId != null && body.telegramUserId !== '') {
    if (typeof body.telegramUserId !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid telegramUserId' }, { status: 400 });
    }
    const t = body.telegramUserId.trim();
    if (!isValidTelegramUserIdString(t)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid Telegram user id (digits only)' },
        { status: 400 },
      );
    }
    telegramUserId = t;
  }

  try {
    if (telegramUserId) {
      const taken = await prisma.adminUser.findFirst({
        where: { telegramUserId },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { ok: false, error: 'Telegram user id already linked to another admin' },
          { status: 400 },
        );
      }
    }

    const hash = await bcrypt.hash(password, 12);
    const created = await prisma.adminUser.create({
      data: {
        login,
        passwordHash: hash,
        isSuperadmin: sanitized.isSuperadmin,
        permissions: sanitized.permissions,
        telegramUserId,
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        isSuperadmin: true,
        permissions: true,
        telegramUserId: true,
      },
    });
    await writeAdminAudit(actor, 'admin.user_create', {
      newLogin: created.login,
      id: created.id,
      isSuperadmin: created.isSuperadmin,
      permissions: created.permissions,
      telegramUserId: created.telegramUserId,
    });
    return NextResponse.json({
      ok: true,
      user: {
        id: created.id,
        login: created.login,
        createdAt: created.createdAt.toISOString(),
        isSuperadmin: created.isSuperadmin,
        permissions: normalizeAdminPermissions(created.permissions) as AdminPermission[],
        telegramUserId: created.telegramUserId,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Login already exists or create failed' },
      { status: 409 },
    );
  }
}
