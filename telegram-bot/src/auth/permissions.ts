/** Keep in sync with web/lib/admin-permissions.ts */
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

export const MENU_SECTIONS: {
  permission: AdminPermission;
  label: string;
  emoji: string;
  cb: string;
}[] = [
  { permission: 'overview', label: 'Overview', emoji: '📊', cb: 'o' },
  { permission: 'config', label: 'Config', emoji: '⚙️', cb: 'cf' },
  { permission: 'support', label: 'Support', emoji: '🎫', cb: 'su' },
  { permission: 'config', label: 'Pro Keys', emoji: '🗝', cb: 'pk' },
  { permission: 'releases', label: 'Releases', emoji: '📝', cb: 'rl' },
  { permission: 'messaging', label: 'Push', emoji: '📣', cb: 'ms' },
  { permission: 'operations', label: 'Operations', emoji: '🧰', cb: 'op' },
  { permission: 'budget', label: 'Budget', emoji: '💰', cb: 'bu' },
  { permission: 'security', label: 'Security', emoji: '🔐', cb: 'sc' },
];

export function hasPermission(
  profile: { isSuperadmin: boolean; permissions: readonly AdminPermission[] },
  permission: AdminPermission,
): boolean {
  if (profile.isSuperadmin) return true;
  return profile.permissions.includes(permission);
}

export function hasAnyPermission(
  profile: { isSuperadmin: boolean; permissions: readonly AdminPermission[] },
  permissions: readonly AdminPermission[],
): boolean {
  if (profile.isSuperadmin) return true;
  return permissions.some((p) => profile.permissions.includes(p));
}
