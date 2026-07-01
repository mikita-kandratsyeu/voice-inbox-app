'use client';

import { ANDROID_WAITLIST_URL, isPublicHttpUrl } from '@/config/constants';

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
    description: 'iOS releases, in-app purchases, APNs, and signing.',
    items: [
      {
        label: 'App Store Connect',
        href: 'https://appstoreconnect.apple.com/',
        caption: 'Builds, TestFlight, app metadata, and IAP.',
      },
      {
        label: 'Keys — APNs Auth Key (.p8)',
        href: 'https://developer.apple.com/account/resources/authkeys/list',
        caption: 'APNs key for Firebase Cloud Messaging on iOS.',
      },
      {
        label: 'Certificates, Identifiers & Profiles',
        href: 'https://developer.apple.com/account/resources/overview',
        caption: 'Signing certificates, App IDs, and provisioning profiles.',
      },
    ],
  };

  const googlePlayGroup: LinkGroup = {
    title: 'Google Play',
    description: 'Android releases and in-app purchases.',
    items: [
      {
        label: 'Google Play Console',
        href: 'https://play.google.com/console/',
        caption: 'Releases, store listing, and Play billing.',
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

  const monetizationGroup: LinkGroup = {
    title: 'Subscriptions & ads',
    description: 'Pro entitlements (RevenueCat) and mobile ads for free tier.',
    items: [
      {
        label: 'RevenueCat',
        href: 'https://app.revenuecat.com/',
        caption: 'IAP entitlements, webhooks, and subscriber sync with the API.',
      },
      {
        label: 'Yandex Mobile Ads',
        href: 'https://partner.yandex.com/',
        caption: 'Banner, interstitial, and rewarded units in the mobile app.',
      },
    ],
  };

  const webItems: LinkItem[] = [
    {
      label: 'Vercel — Dashboard',
      href: 'https://vercel.com/dashboard',
      caption: 'Next.js site, API routes, and deployments.',
    },
    {
      label: 'Vercel — Web Analytics',
      href: 'https://vercel.com/docs/analytics',
      caption: 'Page views & Web Vitals (@vercel/analytics on the landing site).',
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
      caption: `Counter ${ymId} (landing site).`,
    });
  }

  if (isPublicHttpUrl(ANDROID_WAITLIST_URL)) {
    webItems.push({
      label: 'Android waitlist form',
      href: ANDROID_WAITLIST_URL.trim(),
      caption: 'Linked from the landing page when Google Play is not public yet.',
    });
  }

  const webGroup: LinkGroup = {
    title: 'Web hosting & analytics',
    description: 'Vercel project, landing analytics, and optional waitlist.',
    items: webItems,
  };

  const infraGroup: LinkGroup = {
    title: 'Backend & data',
    description: 'Postgres, Redis, async AI workers, and GitHub (when configured on the server).',
    items: [
      {
        label: 'Neon — Console',
        href: 'https://console.neon.tech/',
        caption: 'Postgres: admin users, AppConfig, and support tickets (DATABASE_URL).',
      },
      {
        label: 'Upstash — Redis',
        href: 'https://console.upstash.com/redis',
        caption: 'AI job payloads, rate limits, and API error histograms.',
      },
      {
        label: 'Upstash — QStash',
        href: 'https://console.upstash.com/qstash',
        caption: 'Async AI jobs: primary Cloud Run worker when AI_JOB_WORKER_URL is set; Vercel fallback.',
      },
      {
        label: 'Google Cloud — Cloud Run',
        href: 'https://console.cloud.google.com/run',
        caption: 'AI worker service (ai-worker-staging / ai-worker-prod) when deployed via deploy-ai-worker workflow.',
      },
      {
        label: 'GitHub — Repository',
        href: 'https://github.com/',
        caption: 'Recent commits on the admin Status tab when GITHUB_REPO is configured.',
      },
    ],
  };

  const onDeviceGroup: LinkGroup = {
    title: 'On-device models',
    description: 'Weights downloaded by the mobile app (not billed through our API).',
    items: [
      {
        label: 'Hugging Face',
        href: 'https://huggingface.co/',
        caption: 'Whisper GGML/Core ML encoders and Private-mode LLM GGUF files.',
      },
    ],
  };

  const aiGroup: LinkGroup = {
    title: 'Cloud AI',
    description: 'Smart-mode inference routed from the web API.',
    items: [
      {
        label: 'OpenRouter — Activity',
        href: 'https://openrouter.ai/activity',
        caption: 'Gemini, MiniMax, Nemotron, and other models via OPENROUTER_API_KEY.',
      },
      {
        label: 'DeepSeek — Platform',
        href: 'https://platform.deepseek.com/usage',
        caption: 'Direct API for DeepSeek catalog models when DEEPSEEK_API_KEY is set.',
      },
    ],
  };

  return [
    appleGroup,
    googlePlayGroup,
    monetizationGroup,
    firebaseGroup,
    webGroup,
    infraGroup,
    onDeviceGroup,
    aiGroup,
  ];
}

const linkClass =
  'text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300';

export function AdminExternalObservabilityLinks() {
  const groups = buildLinkGroups();

  return (
    <AdminCard
      title="External dashboards & consoles"
      description="Shortcuts to consoles actually used by the web API and mobile app."
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
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
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
