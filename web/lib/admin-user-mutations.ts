import {
  adminHasPermission,
  permissionsGrantableByActor,
  validatePermissionsPayload,
  type AdminPermission,
} from '@/lib/admin-permissions';
import type { AdminAccessProfile } from '@/lib/admin-access-profile';

export function assertCanManageAdminUsers(actor: AdminAccessProfile): string | null {
  if (!actor.isSuperadmin && !adminHasPermission(actor, 'security')) {
    return 'Forbidden';
  }
  return null;
}

export function sanitizePermissionsForGrant(
  actor: AdminAccessProfile,
  requested: AdminPermission[],
  requestedSuperadmin: boolean,
):
  | { ok: true; isSuperadmin: boolean; permissions: AdminPermission[] }
  | { ok: false; error: string } {
  if (requestedSuperadmin && !actor.isSuperadmin) {
    return { ok: false, error: 'Only a superadmin can create or promote superadmins' };
  }

  const validated = validatePermissionsPayload(requested, requestedSuperadmin);
  if (!validated.ok) {
    return validated;
  }

  if (requestedSuperadmin) {
    return { ok: true, isSuperadmin: true, permissions: [] };
  }

  const grantable = new Set(permissionsGrantableByActor(actor));
  for (const p of validated.permissions) {
    if (!grantable.has(p)) {
      return { ok: false, error: `You cannot grant permission: ${p}` };
    }
  }

  return { ok: true, isSuperadmin: false, permissions: validated.permissions };
}
