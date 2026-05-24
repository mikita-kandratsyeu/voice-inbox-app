/** Admin dashboard tab ids — must match `AdminTab` in AdminDashboard. */
export const ADMIN_PERMISSIONS = [
  'overview',
  'config',
  'support',
  'releases',
  'messaging',
  'operations',
  'budget',
  'security',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ALL_ADMIN_PERMISSIONS: readonly AdminPermission[] = ADMIN_PERMISSIONS;

export const ADMIN_PERMISSION_META: Record<
  AdminPermission,
  { label: string; description: string }
> = {
  overview: {
    label: 'Overview',
    description: 'Health checks, deployments, and GitHub commits',
  },
  config: {
    label: 'App configuration',
    description: 'AI limits, mobile model manifest, and Pro license keys',
  },
  support: {
    label: 'Support',
    description: 'In-app support tickets, replies, and Pro keys from support',
  },
  releases: {
    label: 'Blog / releases',
    description: 'Landing changelog posts per locale',
  },
  messaging: {
    label: 'Push & broadcast',
    description: 'Targeted push and broadcast to registered devices',
  },
  operations: {
    label: 'Operations',
    description: 'Observability links, metrics, exports, and audit log',
  },
  budget: {
    label: 'Budget',
    description: 'Manual expense ledger and running totals',
  },
  security: {
    label: 'Security',
    description: 'Access policy, admin accounts, and Telegram bot user ids',
  },
};

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeAdminPermissions(raw: unknown): AdminPermission[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminPermission[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && isAdminPermission(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}

export function adminHasPermission(
  profile: { isSuperadmin: boolean; permissions: readonly AdminPermission[] },
  permission: AdminPermission,
): boolean {
  if (profile.isSuperadmin) return true;
  return profile.permissions.includes(permission);
}

export function adminHasAnyPermission(
  profile: { isSuperadmin: boolean; permissions: readonly AdminPermission[] },
  permissions: readonly AdminPermission[],
): boolean {
  if (profile.isSuperadmin) return true;
  return permissions.some((p) => profile.permissions.includes(p));
}

/** Subset of permissions the actor may grant to another admin. */
export function permissionsGrantableByActor(actor: {
  isSuperadmin: boolean;
  permissions: readonly AdminPermission[];
}): AdminPermission[] {
  if (actor.isSuperadmin) return [...ALL_ADMIN_PERMISSIONS];
  return ALL_ADMIN_PERMISSIONS.filter((p) => adminHasPermission(actor, p));
}

export function validatePermissionsPayload(
  permissions: unknown,
  isSuperadmin: boolean,
): { ok: true; permissions: AdminPermission[] } | { ok: false; error: string } {
  if (isSuperadmin) {
    return { ok: true, permissions: [] };
  }
  const normalized = normalizeAdminPermissions(permissions);
  if (normalized.length === 0) {
    return { ok: false, error: 'Select at least one tab permission, or enable Superadmin' };
  }
  return { ok: true, permissions: normalized };
}
