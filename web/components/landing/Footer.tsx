import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { VERIFIED_METRICS_URL } from '@/config/constants';
import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { Link } from '@/lib/i18n';

type FooterNavItem =
  | { key: string; href: string; external?: false }
  | { key: string; href: string; external: true };

function getFooterNav(): FooterNavItem[] {
  return [
    { key: 'features', href: '/#features' },
    { key: 'howItWorks', href: '/#how-it-works' },
    { key: 'blog', href: '/blog' },
    { key: 'download', href: '/#download' },
    { key: 'backupViewer', href: '/viewer' },
    ...(VERIFIED_METRICS_URL
      ? [{ key: 'verifiedMetrics', href: VERIFIED_METRICS_URL, external: true as const }]
      : []),
    { key: 'privacyPolicy', href: '/privacy' },
    { key: 'termsOfService', href: '/terms' },
    { key: 'support', href: '/support' },
  ];
}

const footerLinkClass = 'font-medium text-white/78 transition-colors hover:text-white';

export function Footer(): React.ReactElement {
  const t = useTranslations('footer');

  return (
    <footer className="mt-16 border-t border-white/8 bg-slate-950 text-white">
      <div className={`${marketingGutterClass} py-12 sm:py-14`}>
        <div className={marketingContentClass}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
            <div className="max-w-md">
              <Link
                href="/"
                className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
                aria-label="Voice Inbox AI"
              >
                <Image
                  src="/app-icon.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl shadow-[0_10px_24px_rgba(59,130,246,0.35)]"
                />
                <span className="text-lg font-semibold tracking-tight text-white">
                  Voice Inbox AI
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{t('tagline')}</p>
            </div>

            <nav
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm lg:max-w-2xl lg:justify-end"
              aria-label={t('navAria')}
            >
              {getFooterNav().map((item) =>
                item.external ? (
                  <a
                    key={item.key}
                    href={item.href}
                    className={footerLinkClass}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(item.key)}
                  </a>
                ) : (
                  <Link key={item.key} href={item.href} className={footerLinkClass}>
                    {t(item.key)}
                  </Link>
                ),
              )}
            </nav>
          </div>

          <div className="my-8 border-t border-white/10" role="separator" />

          <div className="space-y-2 text-center">
            <p className="text-sm text-white/45">
              {t('copyright', { year: new Date().getFullYear() })}
            </p>
            <p className="mx-auto max-w-2xl text-xs leading-relaxed text-white/35">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
