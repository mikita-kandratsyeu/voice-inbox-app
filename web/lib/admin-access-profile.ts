import {
  adminHasAnyPermission,
  adminHasPermission,
  normalizeAdminPermissions,
  type AdminPermission,
} from '@/lib/admin-permissions';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';
import { prisma } from '@/lib/prisma';

import type { AdminAccessRequirement } from './admin-api-access';

export type AdminAccessProfile = {
  adminId: string;
  login: string;
  isSuperadmin: boolean;
  permissions: AdminPermission[];
};

export async function getAdminAccessProfileFromCookie(
  cookieValue: string | undefined,
): Promise<AdminAccessProfile | null> {
  if (!cookieValue?.trim()) return null;

  const session = await verifyAdminSessionToken(cookieValue);
  if (!session) return null;

  if (!process.env.DATABASE_URL?.trim()) {
    return { adminId: session.adminId, login: session.login, isSuperadmin: true, permissions: [] };
  }

  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
      select: { id: true, login: true, isSuperadmin: true, permissions: true },
    });
    if (!user) return null;
    return {
      adminId: user.id,
      login: user.login,
      isSuperadmin: user.isSuperadmin,
      permissions: normalizeAdminPermissions(user.permissions),
    };
  } catch {
    return null;
  }
}

export function adminAccessRequirementMet(
  profile: AdminAccessProfile,
  requirement: AdminAccessRequirement,
): boolean {
  switch (requirement.type) {
    case 'none':
      return true;
    case 'authenticated':
      return true;
    case 'permission':
      return adminHasPermission(profile, requirement.permission);
    case 'anyPermission':
      return adminHasAnyPermission(profile, requirement.permissions);
    default:
      return false;
  }
}
