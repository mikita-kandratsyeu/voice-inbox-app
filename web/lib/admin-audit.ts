import type { Prisma } from '@/generated/prisma/client';

import type { AdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export async function writeAdminAudit(
  admin: AdminSession,
  action: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.adminId,
        adminLogin: admin.login,
        action,
        metadata: metadata === undefined ? undefined : metadata,
      },
    });
  } catch (e) {
    console.error('[admin-audit]', action, e);
  }
}
