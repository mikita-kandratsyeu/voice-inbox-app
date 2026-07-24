'use client';

import { LogOut, User } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  utilitiesGroupedActionBaseClass,
  utilitiesShellClass,
  utilitiesShellDividerClass,
} from '@/components/ui/utilities-shell';

type AdminSidebarUserPanelProps = {
  adminLogin: string;
  isSuperadmin: boolean;
  onLogout: () => void | Promise<void>;
  className?: string;
  /** Sidebar card (default) or compact pill for mobile header. */
  variant?: 'sidebar' | 'compact';
};

const sidebarCardClass =
  'rounded-xl border border-zinc-200/80 bg-white/80 p-2.5 shadow-sm shadow-zinc-950/5 dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:shadow-black/20';

const iconActionClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

function UserAvatar() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/15 to-indigo-600/15 text-indigo-700 ring-1 ring-indigo-500/20 dark:from-indigo-400/20 dark:to-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/25"
      aria-hidden
    >
      <User className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}

function UserIdentity({
  adminLogin,
  isSuperadmin,
  compact = false,
}: {
  adminLogin: string;
  isSuperadmin: boolean;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={`truncate font-semibold text-zinc-900 dark:text-zinc-50 ${compact ? 'text-xs' : 'text-sm'}`}
        title={adminLogin}
      >
        {adminLogin}
      </p>
      {isSuperadmin ? (
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
          Superadmin
        </p>
      ) : null}
    </div>
  );
}

function UserActions({ onLogout }: { onLogout: () => void | Promise<void> }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <ThemeToggle variant="compact" />
      <button
        type="button"
        onClick={() => void onLogout()}
        aria-label="Log out"
        title="Log out"
        className={iconActionClass}
      >
        <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function AdminSidebarUserPanel({
  adminLogin,
  isSuperadmin,
  onLogout,
  className = '',
  variant = 'sidebar',
}: AdminSidebarUserPanelProps) {
  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className={utilitiesShellClass} role="group" aria-label="Account">
          <div
            className={`flex min-w-0 max-w-32 items-center gap-2 px-2 sm:max-w-40 ${utilitiesGroupedActionBaseClass}`}
          >
            <UserAvatar />
            <UserIdentity adminLogin={adminLogin} isSuperadmin={isSuperadmin} compact />
          </div>
          <span className={utilitiesShellDividerClass} aria-hidden />
          <ThemeToggle variant="grouped" />
          <span className={utilitiesShellDividerClass} aria-hidden />
          <button
            type="button"
            onClick={() => void onLogout()}
            aria-label="Log out"
            title="Log out"
            className={iconActionClass}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-t border-zinc-200/80 px-3 pt-3 pb-6 dark:border-zinc-800 ${className}`.trim()}
    >
      <div className={sidebarCardClass}>
        <div className="flex items-center gap-2.5">
          <UserAvatar />
          <UserIdentity adminLogin={adminLogin} isSuperadmin={isSuperadmin} />
          <UserActions onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}
