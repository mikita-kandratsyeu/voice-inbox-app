import { NextResponse } from 'next/server';

import { getAdminAccessProfileFromRequestCookie } from '@/lib/admin-auth';
import { writeAdminAudit } from '@/lib/admin-audit';
import { assertCanManageAdminUsers, sanitizePermissionsForGrant } from '@/lib/admin-user-mutations';
import { normalizeAdminPermissions, type AdminPermission } from '@/lib/admin-permissions';
import { prisma } from '@/lib/prisma';

type PatchBody = {
  permissions?: unknown;
  isSuperadmin?: unknown;
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

  const sanitized = sanitizePermissionsForGrant(actor, requestedPermissions, requestedSuperadmin);
  if (!sanitized.ok) {
    return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });
  }

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { id: targetId },
      select: { id: true, login: true, isSuperadmin: true },
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

    const updated = await prisma.adminUser.update({
      where: { id: targetId },
      data: {
        isSuperadmin: sanitized.isSuperadmin,
        permissions: sanitized.permissions,
      },
      select: {
        id: true,
        login: true,
        isSuperadmin: true,
        permissions: true,
        createdAt: true,
      },
    });

    await writeAdminAudit(actor, 'admin.user_permissions', {
      targetId: updated.id,
      targetLogin: updated.login,
      isSuperadmin: updated.isSuperadmin,
      permissions: updated.permissions,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        login: updated.login,
        isSuperadmin: updated.isSuperadmin,
        permissions: normalizeAdminPermissions(updated.permissions) as AdminPermission[],
        createdAt: updated.createdAt.toISOString(),
        isCurrent: updated.id === actor.adminId,
      },
    });
  } catch (e) {
    console.error('[admin/users PATCH]', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 503 });
  }
}
