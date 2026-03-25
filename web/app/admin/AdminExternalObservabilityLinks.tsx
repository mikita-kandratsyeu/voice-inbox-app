'use client';

import { AdminCard } from './admin-ui';

type LinkItem = {
  label: string;
  href: string;
  caption?: string;
};

type LinkGroup = {
  title: string;
  description?: string;
  items: LinkItem[];
};

function firebaseProjectUrl(projectId: string, path: string): string {
  return `https://console.firebase.google.com/project/${projectId}${path}`;
}

function buildLinkGroups(): LinkGroup[] {
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_CONSOLE_PROJECT_ID?.trim();
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim();

  const appleGroup: LinkGroup = {
    title: 'Apple & App Store',
    description: 'App Store releases, APNs keys (.p8), signing certs, and identifiers.',
    items: [
      {
        label: 'App Store Connect',
        href: 'https://appstoreconnect.apple.com/',
        caption: 'Builds, TestFlight, app metadata, and monetization.',
      },
      {
        label: 'Keys — APNs Auth Key (.p8)',
        href: 'https://developer.apple.com/account/resources/authkeys/list',
        caption: 'Create the .p8 key used for Apple Push Notification service (APNs).',
      },
      {
        label: 'Certificates, Identifiers & Profiles',
        href: 'https://developer.apple.com/account/resources/overview',
        caption: 'Signing certificates, App IDs, and provisioning profiles.',
      },
    ],
  };

  const firebaseItems: LinkItem[] = firebaseProjectId
    ? [
        {
          label: 'Firebase — Project overview',
          href: firebaseProjectUrl(firebaseProjectId, '/overview'),
        },
        {
          label: 'Firebase — Analytics',
          href: firebaseProjectUrl(firebaseProjectId, '/analytics'),
          caption: 'Mobile events from @react-native-firebase/analytics.',
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
      ]
    : [
        {
          label: 'Firebase Console',
          href: 'https://console.firebase.google.com/',
          caption:
            'Set NEXT_PUBLIC_FIREBASE_CONSOLE_PROJECT_ID for direct links to Analytics, Crashlytics, FCM & Remote Config.',
        },
        {
          label: 'Firebase — Analytics (pick project)',
          href: 'https://console.firebase.google.com/',
        },
        {
          label: 'Firebase — Crashlytics (pick project)',
          href: 'https://console.firebase.google.com/',
        },
      ];

  const firebaseGroup: LinkGroup = {
    title: 'Firebase & mobile stack',
    description: 'Mobile analytics, crashes, FCM, and Remote Config.',
    items: firebaseItems,
  };

  const webItems: LinkItem[] = [
    {
      label: 'Vercel — Dashboard',
      href: 'https://vercel.com/dashboard',
      caption: 'Deployments and project environments.',
    },
    {
      label: 'Vercel — Web Analytics',
      href: 'https://vercel.com/docs/analytics',
      caption: 'Page views & Web Vitals (@vercel/analytics on the site).',
    },
  ];

  if (gaId) {
    webItems.push({
      label: 'Google Analytics',
      href: 'https://analytics.google.com/',
      caption: `Measurement ID ${gaId} (landing).`,
    });
  }

  if (ymId) {
    webItems.push({
      label: 'Yandex Metrika',
      href: `https://metrika.yandex.ru/dashboard?id=${encodeURIComponent(ymId)}`,
      caption: `Counter ${ymId}.`,
    });
  }

  const webGroup: LinkGroup = {
    title: 'Web hosting & analytics',
    description: 'Vercel project and landing-page analytics.',
    items: webItems,
  };

  const infraGroup: LinkGroup = {
    title: 'Backend & infrastructure',
    description: 'Errors, caching, and rate limits when configured.',
    items: [
      {
        label: 'Sentry',
        href: 'https://sentry.io/',
        caption: 'Issues, performance, and releases for the backend and web app.',
      },
      {
        label: 'Upstash — Redis console',
        href: 'https://console.upstash.com/',
        caption: 'Used for API error histograms & rate limits when configured.',
      },
    ],
  };

  const aiGroup: LinkGroup = {
    title: 'AI providers',
    description: 'Model usage and billing.',
    items: [
      {
        label: 'OpenRouter — Activity',
        href: 'https://openrouter.ai/activity',
        caption: 'AI traffic, usage, and billing for the API key.',
      },
    ],
  };

  return [appleGroup, firebaseGroup, webGroup, infraGroup, aiGroup];
}

const linkClass =
  'text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300';

export function AdminExternalObservabilityLinks() {
  const groups = buildLinkGroups();

  return (
    <AdminCard
      title="External dashboards & consoles"
      description="Grouped shortcuts: Apple, mobile stack, web, infra, and AI."
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-8">
        {groups.map((group) => (
          <section key={group.title} className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {group.title}
            </h3>
            {group.description ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {group.description}
              </p>
            ) : null}
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {group.items.map((item) => (
                <li
                  key={`${group.title}:${item.href}:${item.label}`}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                >
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {item.label}
                    <span className="ml-1 text-zinc-400" aria-hidden>
                      ↗
                    </span>
                  </a>
                  {item.caption ? (
                    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.caption}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AdminCard>
  );
}
