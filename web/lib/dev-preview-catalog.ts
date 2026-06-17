import { type AppEnv, isDevelopmentAppEnv } from '@/lib/app-env';

/** Local-only HTML previews (`/api/dev/*`). Disabled unless `APP_ENV=development`. */

export type DevPreviewExample = {
  label: string;
  /** Query string without leading `?`, or empty for default. */
  query: string;
};

export type DevPreviewEntry = {
  id: string;
  title: string;
  description: string;
  apiPath: string;
  /** Optional Next.js page with the same fixtures (dev only). */
  pagePath?: string;
  examples: DevPreviewExample[];
};

export const DEV_PREVIEW_CATALOG: readonly DevPreviewEntry[] = [
  {
    id: 'share-note-email',
    title: 'Share note email',
    description: 'Transactional email when a user shares a note by email (markdown body).',
    apiPath: '/api/dev/share-note-email-preview',
    examples: [
      { label: 'Default (speaker turns)', query: '' },
      { label: 'Transcript', query: 'variant=transcript' },
      { label: 'Meeting brief', query: 'variant=meeting-brief' },
      { label: 'Tasks (mixed status)', query: 'variant=tasks' },
      { label: 'Custom title', query: 'variant=meeting-brief&title=Demo' },
    ],
  },
  {
    id: 'pro-license-email',
    title: 'Pro license key email',
    description: 'Email sent when support or admin issues a Pro license key.',
    apiPath: '/api/dev/pro-license-email-preview',
    examples: [
      { label: '12 months (default)', query: 'months=12&email=demo@example.com' },
      { label: '14 days', query: 'days=14&email=demo@example.com' },
      { label: 'Custom key', query: 'months=1&key=VI-DEMO-DEMO-DEMO&email=demo@example.com' },
    ],
  },
  {
    id: 'account-pro',
    title: 'Account Pro portal page',
    description:
      'Web page shown from the app (Settings → Your plan) for license / voucher activations.',
    apiPath: '/api/dev/account-pro-preview',
    pagePath: '/dev/account-pro-preview',
    examples: [
      { label: 'All examples (index)', query: 'list=1' },
      { label: 'Gift voucher (success)', query: 'variant=voucher-success' },
      { label: 'Gift voucher · RU · dark', query: 'variant=voucher-success&locale=ru&theme=dark' },
      { label: 'License key (success)', query: 'variant=license-success' },
      { label: 'App Store / Play (success)', query: 'variant=store-success' },
      { label: 'Lifetime license', query: 'variant=license-success&lifetime=1' },
      { label: 'Custom expiry', query: 'variant=voucher-success&expires=2027-03-01T00:00:00.000Z' },
      { label: 'Missing token', query: 'variant=missing' },
      { label: 'Invalid token', query: 'variant=invalid' },
      { label: 'Pro inactive', query: 'variant=inactive' },
    ],
  },
] as const;

export function isDevPreviewCatalogEnabledForAppEnv(appEnv: AppEnv): boolean {
  return appEnv === 'development';
}

/** Server-only; client components should use `isDevPreviewCatalogEnabledForAppEnv(appEnv)`. */
export function isDevPreviewCatalogEnabled(): boolean {
  return isDevelopmentAppEnv();
}

export function buildDevPreviewUrl(origin: string, apiPath: string, query = ''): string {
  const base = origin.replace(/\/$/, '');
  const q = query.trim();
  return q.length > 0 ? `${base}${apiPath}?${q}` : `${base}${apiPath}`;
}

export function buildDevPreviewPageUrl(origin: string, pagePath: string, query = ''): string {
  const base = origin.replace(/\/$/, '');
  const q = query.trim();
  return q.length > 0 ? `${base}${pagePath}?${q}` : `${base}${pagePath}`;
}

export function buildAccountProPreviewExampleLinks(
  origin: string,
): { label: string; href: string }[] {
  const entry = DEV_PREVIEW_CATALOG.find((e) => e.id === 'account-pro');
  if (!entry) return [];
  return entry.examples.map((ex) => ({
    label: ex.label,
    href: buildDevPreviewUrl(origin, entry.apiPath, ex.query),
  }));
}
