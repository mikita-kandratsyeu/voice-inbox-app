import { NextResponse } from 'next/server';

import { getAdminAccessProfileFromRequestCookie } from '@/lib/admin-auth';
import { writeAdminAudit } from '@/lib/admin-audit';
import {
  assertCanManageAdminUsers,
  sanitizePermissionsForGrant,
  validateAdminUserDeletion,
} from '@/lib/admin-user-mutations';
import { normalizeAdminPermissions, type AdminPermission } from '@/lib/admin-permissions';
import { prisma } from '@/lib/prisma';
import { isValidTelegramUserIdString } from '@/lib/telegram-admin-whitelist';

type PatchBody = {
  permissions?: unknown;
  isSuperadmin?: unknown;
  telegramUserId?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  const { id } = await context.params;
  const targetId = id?.trim();
  if (!targetId) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const requestedSuperadmin = body.isSuperadmin === true;
  const requestedPermissions = normalizeAdminPermissions(body.permissions);
  const hasTelegramField = Object.prototype.hasOwnProperty.call(body, 'telegramUserId');

  let telegramUserId: string | null | undefined;
  if (hasTelegramField) {
    if (body.telegramUserId === null || body.telegramUserId === '') {
      telegramUserId = null;
    } else if (typeof body.telegramUserId === 'string') {
      const t = body.telegramUserId.trim();
      if (!isValidTelegramUserIdString(t)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid Telegram user id (digits only)' },
          { status: 400 },
        );
      }
      telegramUserId = t;
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid telegramUserId' }, { status: 400 });
    }
  }

  const sanitized = sanitizePermissionsForGrant(actor, requestedPermissions, requestedSuperadmin);
  if (!sanitized.ok) {
    return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });
  }

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { id: targetId },
      select: { id: true, login: true, isSuperadmin: true, telegramUserId: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    if (existing.id === actor.adminId && existing.isSuperadmin && !sanitized.isSuperadmin) {
      return NextResponse.json(
        { ok: false, error: 'Cannot remove your own superadmin role' },
        { status: 400 },
      );
    }

    if (
      existing.id === actor.adminId &&
      !sanitized.isSuperadmin &&
      !sanitized.permissions.includes('security')
    ) {
      return NextResponse.json(
        { ok: false, error: 'Cannot remove your own Security permission' },
        { status: 400 },
      );
    }

    if (telegramUserId !== undefined && telegramUserId !== null) {
      const taken = await prisma.adminUser.findFirst({
        where: { telegramUserId, NOT: { id: targetId } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { ok: false, error: 'Telegram user id already linked to another admin' },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.adminUser.update({
      where: { id: targetId },
      data: {
        isSuperadmin: sanitized.isSuperadmin,
        permissions: sanitized.permissions,
        ...(telegramUserId !== undefined ? { telegramUserId } : {}),
      },
      select: {
        id: true,
        login: true,
        isSuperadmin: true,
        permissions: true,
        createdAt: true,
        telegramUserId: true,
      },
    });

    await writeAdminAudit(actor, 'admin.user_permissions', {
      targetId: updated.id,
      targetLogin: updated.login,
      isSuperadmin: updated.isSuperadmin,
      permissions: updated.permissions,
      ...(telegramUserId !== undefined
        ? {
            telegramUserId: updated.telegramUserId,
            telegramLinked: Boolean(updated.telegramUserId),
          }
        : {}),
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        login: updated.login,
        isSuperadmin: updated.isSuperadmin,
        permissions: normalizeAdminPermissions(updated.permissions) as AdminPermission[],
        createdAt: updated.createdAt.toISOString(),
        telegramUserId: updated.telegramUserId,
        isCurrent: updated.id === actor.adminId,
      },
    });
  } catch (e) {
    console.error('[admin/users PATCH]', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 503 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const actor = await getAdminAccessProfileFromRequestCookie();
  if (!actor) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const targetId = id?.trim();
  if (!targetId) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    const [existing, totalAdminCount, superadminCount] = await Promise.all([
      prisma.adminUser.findUnique({
        where: { id: targetId },
        select: { id: true, login: true, isSuperadmin: true },
      }),
      prisma.adminUser.count(),
      prisma.adminUser.count({ where: { isSuperadmin: true } }),
    ]);

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const validationError = validateAdminUserDeletion({
      actor,
      target: existing,
      totalAdminCount,
      superadminCount,
    });
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    await prisma.adminUser.delete({ where: { id: targetId } });

    await writeAdminAudit(actor, 'admin.user_delete', {
      targetId: existing.id,
      targetLogin: existing.login,
      wasSuperadmin: existing.isSuperadmin,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/users DELETE]', e);
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 503 });
  }
}
