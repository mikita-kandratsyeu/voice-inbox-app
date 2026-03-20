import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;

type PatchBody = { currentPassword?: unknown; newPassword?: unknown };

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const nextPw = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!current.trim()) {
    return NextResponse.json({ ok: false, error: 'currentPassword required' }, { status: 400 });
  }
  if (nextPw.length < PASSWORD_MIN) {
    return NextResponse.json(
      { ok: false, error: `newPassword at least ${PASSWORD_MIN} characters` },
      { status: 400 },
    );
  }
  if (nextPw.length > PASSWORD_MAX) {
    return NextResponse.json({ ok: false, error: 'newPassword too long' }, { status: 400 });
  }

  try {
    const user = await prisma.adminUser.findUnique({ where: { id: admin.adminId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    const ok = await bcrypt.compare(current.trim(), user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Current password incorrect' }, { status: 401 });
    }
    const hash = await bcrypt.hash(nextPw, 12);
    await prisma.adminUser.update({
      where: { id: admin.adminId },
      data: { passwordHash: hash },
    });
    await writeAdminAudit(admin, 'admin.password_change', {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/users/me PATCH]', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 503 });
  }
}
