'use client';

import { Check, Loader2 } from 'lucide-react';
import type { useTranslations } from 'next-intl';

import type { BackupZipParseProgress } from '@/lib/backup-export';

type Translator = ReturnType<typeof useTranslations<'viewerPage'>>;

const STAGE_LABEL_KEY: Record<
  Exclude<BackupZipParseProgress, 'done'>,
  'loadingVerifyingPassword' | 'loadingReadingArchive' | 'loadingCheckingMetadata'
> = {
  verifying_password: 'loadingVerifyingPassword',
  reading_archive: 'loadingReadingArchive',
  checking_metadata: 'loadingCheckingMetadata',
};

type Props = {
  stage: BackupZipParseProgress;
  verifyingPassword: boolean;
  t: Translator;
};

function stageOrder(verifyingPassword: boolean): BackupZipParseProgress[] {
  return verifyingPassword
    ? ['verifying_password', 'reading_archive', 'checking_metadata', 'done']
    : ['reading_archive', 'checking_metadata', 'done'];
}

function stageIndex(order: BackupZipParseProgress[], stage: BackupZipParseProgress): number {
  const i = order.indexOf(stage);
  return i >= 0 ? i : 0;
}

export function BackupZipLoadProgress({ stage, verifyingPassword, t }: Props) {
  const order = stageOrder(verifyingPassword);
  const activeIndex = stageIndex(order, stage);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={stage !== 'done'}
      className="w-full max-w-sm text-left"
    >
      <ul className="space-y-2">
        {order.map((step, index) => {
          const isDone = index < activeIndex || (stage === 'done' && index === order.length - 1);
          const isActive = index === activeIndex && stage !== 'done';
          const isPending = index > activeIndex;

          const label =
            step === 'done'
              ? t('loadingDone')
              : t(STAGE_LABEL_KEY[step as Exclude<BackupZipParseProgress, 'done'>]);

          return (
            <li
              key={step}
              className={[
                'flex items-center gap-2.5 text-sm',
                isDone
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : isActive
                    ? 'font-medium text-slate-900 dark:text-white'
                    : isPending
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-600 dark:text-slate-400',
              ].join(' ')}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
