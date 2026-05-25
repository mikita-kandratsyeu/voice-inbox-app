'use client';

import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

import {
  buildDevPreviewPageUrl,
  buildDevPreviewUrl,
  DEV_PREVIEW_CATALOG,
  isDevPreviewCatalogEnabled,
} from '@/lib/dev-preview-catalog';

import { AdminAlert, AdminCard, adminBtnSecondaryClass } from './admin-ui';

export function AdminDevPreviewsPanel() {
  const enabled = isDevPreviewCatalogEnabled();

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  if (!enabled) {
    return (
      <AdminAlert tone="info">
        Dev preview endpoints are only available when the web app runs with{' '}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
          NODE_ENV=development
        </code>{' '}
        (local <code className="font-mono text-xs">yarn dev</code>).
      </AdminAlert>
    );
  }

  return (
    <div className="space-y-6">
      <AdminAlert tone="warning">
        Opens rendered HTML in a new tab. Endpoints return 404 in production builds — use only on
        local dev.
      </AdminAlert>

      {DEV_PREVIEW_CATALOG.map((entry) => (
        <AdminCard
          key={entry.id}
          title={entry.title}
          description={
            <>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                {entry.apiPath}
              </code>
              {entry.pagePath ? (
                <span className="mt-1 block text-zinc-500 dark:text-zinc-400">
                  Page mirror:{' '}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
                    {entry.pagePath}
                  </code>
                </span>
              ) : null}
              <span className="mt-2 block">{entry.description}</span>
            </>
          }
        >
          <ul className="space-y-3">
            {entry.examples.map((ex) => {
              const apiHref = buildDevPreviewUrl(origin, entry.apiPath, ex.query);
              const pageHref =
                entry.pagePath != null
                  ? buildDevPreviewPageUrl(origin, entry.pagePath, ex.query)
                  : null;

              return (
                <li
                  key={`${entry.id}-${ex.label}`}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ex.label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {apiHref}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={apiHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={adminBtnSecondaryClass}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      Open API preview
                    </a>
                    {pageHref != null ? (
                      <a
                        href={pageHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={adminBtnSecondaryClass}
                      >
                        <ExternalLink
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Open page
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ))}
    </div>
  );
}
