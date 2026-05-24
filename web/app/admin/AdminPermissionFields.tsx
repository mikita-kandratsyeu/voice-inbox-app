'use client';

import {
  ADMIN_PERMISSION_META,
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/lib/admin-permissions';

type Props = {
  isSuperadmin: boolean;
  permissions: AdminPermission[];
  grantablePermissions: AdminPermission[] | null;
  canSetSuperadmin: boolean;
  onSuperadminChange: (value: boolean) => void;
  onPermissionsChange: (permissions: AdminPermission[]) => void;
  disabled?: boolean;
};

export function AdminPermissionFields({
  isSuperadmin,
  permissions,
  grantablePermissions,
  canSetSuperadmin,
  onSuperadminChange,
  onPermissionsChange,
  disabled = false,
}: Props) {
  const grantableSet = grantablePermissions ? new Set(grantablePermissions) : null;

  const toggle = (perm: AdminPermission) => {
    if (disabled || isSuperadmin) return;
    if (grantableSet && !grantableSet.has(perm)) return;
    if (permissions.includes(perm)) {
      onPermissionsChange(permissions.filter((p) => p !== perm));
    } else {
      onPermissionsChange([...permissions, perm]);
    }
  };

  return (
    <div className="space-y-3">
      {canSetSuperadmin ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <input
            type="checkbox"
            checked={isSuperadmin}
            disabled={disabled}
            onChange={(e) => onSuperadminChange(e.target.checked)}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Superadmin
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              Full access to every tab and can manage all admins.
            </span>
          </span>
        </label>
      ) : null}

      <fieldset disabled={disabled || isSuperadmin} className="space-y-2 disabled:opacity-60">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tab access</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ALL_ADMIN_PERMISSIONS.map((perm) => {
            const meta = ADMIN_PERMISSION_META[perm];
            const canGrant = grantableSet === null || grantableSet.has(perm);
            return (
              <li key={perm}>
                <label
                  className={`flex h-full cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 ${
                    canGrant
                      ? 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40'
                      : 'cursor-not-allowed border-zinc-100 bg-zinc-50/40 opacity-50 dark:border-zinc-800 dark:bg-zinc-900/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSuperadmin || permissions.includes(perm)}
                    disabled={!canGrant || isSuperadmin}
                    onChange={() => toggle(perm)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {meta.description}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
