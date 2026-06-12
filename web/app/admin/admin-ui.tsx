import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { adminMainScrollRowClass } from './admin-layout';

/** Enhanced form controls with modern focus states and transitions */
export const adminInputClass =
  'w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-600/70 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/15 dark:backdrop-blur-sm';

export const adminSelectClass = adminInputClass;

/** Enhanced primary button with gradient and hover lift */
export const adminBtnPrimaryClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none dark:from-indigo-500 dark:to-indigo-600 dark:shadow-indigo-500/25 dark:hover:shadow-indigo-500/35 dark:focus-visible:outline-indigo-400';

/** Enhanced secondary button with subtle hover */
export const adminBtnSecondaryClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300/80 bg-white/80 px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-zinc-50 hover:border-zinc-400 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-600/70 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-700/70 dark:hover:border-zinc-500 dark:focus-visible:outline-zinc-500';

/** Ghost button with smooth hover background */
export const adminBtnGhostClass =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100/80 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100';

/** Danger button for destructive actions */
export const adminBtnDangerClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 dark:from-red-500 dark:to-red-600';

/** Enhanced card with subtle gradient and improved shadow */
export const adminCardSurfaceClass =
  'rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/30 shadow-lg shadow-zinc-950/[0.04] backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-zinc-950/[0.06] dark:border-zinc-700/80 dark:from-zinc-900/95 dark:via-zinc-900/95 dark:to-zinc-800/50 dark:shadow-black/25 dark:hover:shadow-black/35';

/** Compact card for metrics and stats */
export const adminMetricCardClass =
  'rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50/50 p-4 shadow-md shadow-zinc-950/[0.03] backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-zinc-950/[0.05] dark:border-zinc-700/70 dark:from-zinc-900/90 dark:to-zinc-800/40 dark:shadow-black/20 dark:hover:shadow-black/30';

type AdminCardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: ReactNode;
  headerRight?: ReactNode;
  padding?: boolean;
  hoverable?: boolean;
};

export function AdminCard({
  children,
  className = '',
  title,
  description,
  headerRight,
  padding = true,
  hoverable = false,
}: AdminCardProps) {
  const hasHeader = Boolean(title || description || headerRight);
  return (
    <section
      className={`${adminCardSurfaceClass} ${hoverable ? 'cursor-pointer' : ''} ${className}`.trim()}
    >
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100/80 px-5 py-4 backdrop-blur-sm dark:border-zinc-800/80">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h2>
            ) : null}
            {description != null && description !== '' ? (
              <div className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {description}
              </div>
            ) : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      ) : null}
      <div className={padding ? (hasHeader ? 'px-5 pb-5 pt-4' : 'p-5') : ''}>{children}</div>
    </section>
  );
}

type AdminPanelHeadingProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPanelHeading({ title, description, actions }: AdminPanelHeadingProps) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

type AdminMetricCardProps = {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function AdminMetricCard({
  title,
  icon: Icon,
  children,
  className = '',
  trend,
}: AdminMetricCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400';

  return (
    <section className={`${adminMetricCardClass} ${className}`.trim()}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:from-indigo-400/15 dark:to-indigo-500/15 dark:text-indigo-400 dark:ring-indigo-400/25">
            <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{title}</h2>
        </div>
        {trend && (
          <div className={`text-xs font-semibold ${trendColor}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </div>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export function AdminStatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const map: Record<StatusTone, string> = {
    success:
      'bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-600/20 backdrop-blur-sm dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-500/30',
    warning:
      'bg-amber-50/80 text-amber-900 ring-1 ring-amber-600/20 backdrop-blur-sm dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-500/30',
    error:
      'bg-red-50/80 text-red-800 ring-1 ring-red-600/20 backdrop-blur-sm dark:bg-red-950/60 dark:text-red-200 dark:ring-red-500/30',
    neutral:
      'bg-zinc-100/80 text-zinc-700 ring-1 ring-zinc-400/25 backdrop-blur-sm dark:bg-zinc-800/70 dark:text-zinc-200 dark:ring-zinc-500/30',
    info: 'bg-sky-50/80 text-sky-900 ring-1 ring-sky-600/20 backdrop-blur-sm dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-500/30',
  };
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  title,
  hint,
  icon: Icon,
  action,
  className = '',
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300/80 bg-gradient-to-br from-zinc-50/90 to-white/80 px-8 py-16 text-center backdrop-blur-sm dark:border-zinc-700/80 dark:from-zinc-900/50 dark:to-zinc-800/30 ${className}`.trim()}
    >
      {Icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100/80 text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500">
          <Icon className="h-7 w-7" strokeWidth={2} />
        </div>
      )}
      <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
      {hint ? <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function formatAdminDate(ts: number | Date): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type AdminSubNavItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function AdminSubNav<T extends string>({
  items,
  value,
  onChange,
  className = '',
}: {
  items: readonly AdminSubNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={adminMainScrollRowClass}>
      <nav
        className={`inline-flex w-max max-w-none flex-nowrap gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/60 p-1.5 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/70 md:w-fit md:max-w-full md:flex-wrap ${className}`.trim()}
        aria-label="Section"
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                active
                  ? 'bg-white text-zinc-900 shadow-md shadow-zinc-950/5 dark:bg-zinc-800 dark:text-zinc-50 dark:shadow-black/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {item.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      active
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

type AdminFormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  mono?: boolean;
  children: ReactNode;
};

export function AdminFormField({
  label,
  hint,
  error,
  required,
  mono,
  children,
}: AdminFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        className={`block text-sm font-semibold text-zinc-800 dark:text-zinc-200 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function AdminAlert({
  tone,
  children,
  className = '',
  dismissible,
  onDismiss,
}: {
  tone: 'warning' | 'info' | 'success' | 'error';
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const map = {
    warning:
      'bg-gradient-to-br from-amber-50 to-amber-50/60 text-amber-950 border-amber-300/80 dark:from-amber-950/50 dark:to-amber-950/30 dark:text-amber-100 dark:border-amber-800/60',
    info: 'bg-gradient-to-br from-sky-50 to-sky-50/60 text-sky-950 border-sky-300/80 dark:from-sky-950/50 dark:to-sky-950/30 dark:text-sky-100 dark:border-sky-800/60',
    success:
      'bg-gradient-to-br from-emerald-50 to-emerald-50/60 text-emerald-950 border-emerald-300/80 dark:from-emerald-950/50 dark:to-emerald-950/30 dark:text-emerald-100 dark:border-emerald-800/60',
    error:
      'bg-gradient-to-br from-red-50 to-red-50/60 text-red-900 border-red-300/80 dark:from-red-950/50 dark:to-red-950/30 dark:text-red-100 dark:border-red-800/60',
  };
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${map[tone]} ${className}`.trim()}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <div className="flex-1">{children}</div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function AdminCollapsibleCard({
  title,
  defaultOpen = true,
  headerAction,
  children,
  contentClassName = '',
}: {
  title: string;
  defaultOpen?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group min-w-0 overflow-hidden ${adminCardSurfaceClass}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 border-b border-zinc-100/80 px-5 py-4 transition-all duration-200 hover:bg-zinc-50/50 marker:content-none dark:border-zinc-800/80 dark:hover:bg-zinc-800/40 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          {title}
        </span>
        <span
          className="flex shrink-0 items-center gap-3"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {headerAction}
          <ChevronDown
            className="h-4.5 w-4.5 text-zinc-400 transition-transform duration-300 group-open:rotate-180 dark:text-zinc-500"
            aria-hidden
          />
        </span>
      </summary>
      <div
        className={`max-h-[calc(60vh-3.25rem)] overflow-y-auto overscroll-y-contain p-5 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </details>
  );
}

export function AdminDetailsSection({
  summary,
  defaultOpen = false,
  badge,
  children,
  className = '',
}: {
  summary: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50/70 to-white/60 backdrop-blur-sm transition-all duration-200 hover:border-zinc-300 dark:border-zinc-700/80 dark:from-zinc-900/40 dark:to-zinc-800/30 dark:hover:border-zinc-600 ${className}`.trim()}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-zinc-800 marker:content-none transition-colors hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-50 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <span
            className="text-zinc-400 transition-transform duration-200 group-open:rotate-90 dark:text-zinc-500"
            aria-hidden
          >
            ▸
          </span>
          {summary}
        </span>
        {badge}
      </summary>
      <div className="border-t border-zinc-200/80 px-4 pb-4 pt-3.5 dark:border-zinc-700/80">
        {children}
      </div>
    </details>
  );
}

/** Enhanced table styles */
export const adminTableClass = 'min-w-full divide-y divide-zinc-200/80 dark:divide-zinc-700/80';

export const adminTableHeadClass =
  'bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900/80 dark:to-zinc-800/40';

export const adminTableHeaderCellClass =
  'px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400';

export const adminTableBodyClass =
  'divide-y divide-zinc-100 bg-white dark:divide-zinc-800/50 dark:bg-zinc-900/50';

export const adminTableRowClass =
  'transition-colors duration-150 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50';

export const adminTableCellClass = 'px-4 py-3.5 text-sm text-zinc-900 dark:text-zinc-100';
