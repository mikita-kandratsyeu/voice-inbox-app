import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared form controls — focus rings for keyboard users */
export const adminInputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25';

export const adminSelectClass = adminInputClass;

export const adminBtnPrimaryClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-400';

export const adminBtnSecondaryClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:outline-zinc-500';

export const adminBtnGhostClass =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:text-zinc-400 dark:hover:bg-zinc-800';

export const adminCardSurfaceClass =
  'rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:shadow-black/20';

type AdminCardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: ReactNode;
  headerRight?: ReactNode;
  padding?: boolean;
};

export function AdminCard({
  children,
  className = '',
  title,
  description,
  headerRight,
  padding = true,
}: AdminCardProps) {
  const hasHeader = Boolean(title || description || headerRight);
  return (
    <section className={`${adminCardSurfaceClass} ${className}`.trim()}>
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h2>
            ) : null}
            {description != null && description !== '' ? (
              <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</div>
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type AdminMetricCardProps = {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function AdminMetricCard({
  title,
  icon: Icon,
  children,
  className = '',
}: AdminMetricCardProps) {
  return (
    <section className={`${adminCardSurfaceClass} ${className}`.trim()}>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export function AdminStatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const map: Record<StatusTone, string> = {
    success:
      'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-500/20',
    warning:
      'bg-amber-50 text-amber-900 ring-1 ring-amber-600/15 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-500/20',
    error:
      'bg-red-50 text-red-800 ring-1 ring-red-600/15 dark:bg-red-950/45 dark:text-red-200 dark:ring-red-500/20',
    neutral:
      'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-400/20 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-500/20',
    info: 'bg-sky-50 text-sky-900 ring-1 ring-sky-600/15 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-500/20',
  };
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  title,
  hint,
  className = '',
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40 ${className}`.trim()}
    >
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
      {hint ? <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export function formatAdminDate(ts: number | Date): string {
  return new Date(ts).toLocaleString();
}

type AdminSubNavItem<T extends string> = {
  id: T;
  label: string;
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
    <nav
      className={`inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/60 ${className}`.trim()}
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

type AdminFormFieldProps = {
  label: string;
  hint?: string;
  mono?: boolean;
  children: ReactNode;
};

export function AdminFormField({ label, hint, mono, children }: AdminFormFieldProps) {
  return (
    <div>
      <label
        className={`mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function AdminAlert({
  tone,
  children,
  className = '',
}: {
  tone: 'warning' | 'info' | 'success' | 'error';
  children: ReactNode;
  className?: string;
}) {
  const map = {
    warning:
      'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 border-amber-200/80 dark:border-amber-900/50',
    info: 'bg-sky-50 text-sky-950 dark:bg-sky-950/35 dark:text-sky-100 border-sky-200/80 dark:border-sky-900/50',
    success:
      'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/35 dark:text-emerald-100 border-emerald-200/80 dark:border-emerald-900/50',
    error:
      'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100 border-red-200/80 dark:border-red-900/50',
  };
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${map[tone]} ${className}`.trim()}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {children}
    </p>
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
      className={`group rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30 ${className}`.trim()}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-800 marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span
            className="text-zinc-400 transition group-open:rotate-90 dark:text-zinc-500"
            aria-hidden
          >
            ▸
          </span>
          {summary}
        </span>
        {badge}
      </summary>
      <div className="border-t border-zinc-200/80 px-4 pb-4 pt-3 dark:border-zinc-700">
        {children}
      </div>
    </details>
  );
}
