'use client';

type LinkItem = {
  label: string;
  href: string;
  caption?: string;
};

function firebaseProjectUrl(projectId: string, path: string): string {
  return `https://console.firebase.google.com/project/${projectId}${path}`;
}

function buildLinks(): LinkItem[] {
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_CONSOLE_PROJECT_ID?.trim();
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim();

  const items: LinkItem[] = [];

  if (firebaseProjectId) {
    items.push(
      {
        label: 'Firebase — project overview',
        href: firebaseProjectUrl(firebaseProjectId, '/overview'),
      },
      {
        label: 'Firebase — Crashlytics',
        href: firebaseProjectUrl(firebaseProjectId, '/crashlytics'),
      },
      {
        label: 'Firebase — Cloud Messaging',
        href: firebaseProjectUrl(firebaseProjectId, '/messaging'),
      },
      {
        label: 'Firebase — Remote Config',
        href: firebaseProjectUrl(firebaseProjectId, '/config'),
        caption: 'Mobile release config (WEB_API_URL, ad units, etc.).',
      },
    );
  } else {
    items.push(
      {
        label: 'Firebase Console',
        href: 'https://console.firebase.google.com/',
        caption:
          'Set NEXT_PUBLIC_FIREBASE_CONSOLE_PROJECT_ID for direct links to Crashlytics, FCM & Remote Config.',
      },
      {
        label: 'Firebase — Crashlytics (pick project)',
        href: 'https://console.firebase.google.com/',
      },
    );
  }

  items.push(
    {
      label: 'Vercel — Web Analytics',
      href: 'https://vercel.com/docs/analytics',
      caption: 'Page views & Web Vitals (@vercel/analytics on the site).',
    },
    {
      label: 'Vercel — Dashboard',
      href: 'https://vercel.com/dashboard',
    },
  );

  if (gaId) {
    items.push({
      label: 'Google Analytics',
      href: 'https://analytics.google.com/',
      caption: `Measurement ID ${gaId} (landing).`,
    });
  }

  if (ymId) {
    items.push({
      label: 'Yandex Metrika',
      href: `https://metrika.yandex.ru/dashboard?id=${encodeURIComponent(ymId)}`,
      caption: `Counter ${ymId}.`,
    });
  }

  items.push(
    {
      label: 'Upstash — Redis console',
      href: 'https://console.upstash.com/',
      caption: 'Used for API error histograms & rate limits when configured.',
    },
    {
      label: 'OpenRouter — Activity',
      href: 'https://openrouter.ai/activity',
      caption: 'AI traffic, usage, and billing for the API key.',
    },
  );

  return items;
}

export function AdminExternalObservabilityLinks() {
  const links = buildLinks();

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        External logging &amp; crash tools
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Third-party dashboards tied to this stack (mobile crashes, web analytics, Redis metrics, AI
        usage).
      </p>
      <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-700">
        {links.map((item) => (
          <li key={item.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {item.label}
              <span className="ml-1 text-zinc-400" aria-hidden>
                ↗
              </span>
            </a>
            {item.caption ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.caption}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
