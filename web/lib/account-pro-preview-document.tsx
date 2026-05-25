import type { ReactElement } from 'react';

import {
  ProAccountAlert,
  ProAccountCard,
  ProAccountMain,
  ProAccountPageRoot,
  ProAccountSuccess,
  type AccountProSuccessCopy,
  type ProAccountAlertTone,
} from '@/components/account-pro/AccountProViews';
import type {
  AccountProPreviewOptions,
  AccountProPreviewState,
} from '@/lib/account-pro-preview-fixtures';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import enMessages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

export type { AccountProPreviewOptions } from '@/lib/account-pro-preview-fixtures';

function homeHref(locale: AccountProPreviewOptions['locale']): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return locale === 'en' ? `${base}/` : `${base}/ru/`;
}

function pickSuccessCopy(m: (typeof enMessages)['accountPro']): AccountProSuccessCopy {
  return {
    planLabel: m.planLabel,
    title: m.title,
    activationType: m.activationType,
    typeLicense: m.typeLicense,
    typeVoucher: m.typeVoucher,
    typeStore: m.typeStore,
    footerNoteVoucher: m.footerNoteVoucher,
    status: m.status,
    statusActive: m.statusActive,
    renewsOrExpires: m.renewsOrExpires,
    validThrough: m.validThrough,
    lifetimeValue: m.lifetimeValue,
    footerNote: m.footerNote,
  };
}

function alertToneForState(state: Exclude<AccountProPreviewState, 'success'>): ProAccountAlertTone {
  if (state === 'missing') return 'neutral';
  if (state === 'invalid') return 'danger';
  return 'warning';
}

function MinimalPreviewHeader({
  locale,
}: {
  locale: AccountProPreviewOptions['locale'];
}): ReactElement {
  const home = homeHref(locale);

  return (
    <header className="mb-10 flex justify-center">
      <a
        href={home}
        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-2.5 text-black shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- lightweight dev preview header */}
        <img
          src={`${BASE_URL_OR_FALLBACK.replace(/\/$/, '')}/app-icon.svg`}
          width={40}
          height={40}
          alt=""
          className="h-10 w-10 rounded-xl shadow-[0_10px_24px_rgba(59,130,246,0.25)]"
        />
        <span className="text-base font-semibold tracking-tight">Voice Inbox AI</span>
      </a>
    </header>
  );
}

function DevPreviewBanner({ text }: { text: string }): ReactElement {
  return (
    <div className="mb-6 rounded-xl border border-dashed border-amber-600/40 bg-amber-500/15 px-4 py-3 text-center text-xs font-medium text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/12 dark:text-amber-50">
      {text}
    </div>
  );
}

/** Dev-only: same UI as `/account/pro`, without a portal token. Renders as a Server Component. */
export function AccountProDevPreview(props: AccountProPreviewOptions): ReactElement {
  const messages = props.locale === 'ru' ? ruMessages.accountPro : enMessages.accountPro;

  const banner = `Dev preview — account/pro · state=${props.state} · locale=${props.locale} · kind=${props.kind} · lifetime=${props.isLifetime ? '1' : '0'}`;

  let inner: ReactElement;

  if (props.state === 'success') {
    const expiresAt = new Date(props.sampleExpiresAt);
    const dateLabel =
      Number.isFinite(expiresAt.getTime()) && !props.isLifetime
        ? new Intl.DateTimeFormat(props.locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(expiresAt)
        : null;

    inner = (
      <ProAccountSuccess
        copy={pickSuccessCopy(messages)}
        kind={props.kind}
        isLifetime={props.isLifetime}
        dateLabel={dateLabel}
      />
    );
  } else {
    const alertState = props.state;
    const tone = alertToneForState(alertState);
    const title =
      props.state === 'missing'
        ? messages.missingTokenTitle
        : props.state === 'invalid'
          ? messages.invalidTokenTitle
          : messages.notActiveTitle;
    const description =
      props.state === 'missing'
        ? messages.missingTokenBody
        : props.state === 'invalid'
          ? messages.invalidTokenBody
          : messages.notActiveBody;

    inner = <ProAccountAlert title={title} description={description} tone={tone} />;
  }

  return (
    <ProAccountPageRoot>
      <MinimalPreviewHeader locale={props.locale} />
      <ProAccountMain>
        <DevPreviewBanner text={banner} />
        <ProAccountCard>{inner}</ProAccountCard>
      </ProAccountMain>
    </ProAccountPageRoot>
  );
}
