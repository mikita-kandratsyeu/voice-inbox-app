'use client';

import { Loader2, Lock, Shield } from 'lucide-react';
import type { useTranslations } from 'next-intl';

import type { BackupZipParseProgress } from '@/lib/backup-export';

import { BackupZipLoadProgress } from './BackupZipLoadProgress';

type Translator = ReturnType<typeof useTranslations<'viewerPage'>>;

type Props = {
  loadedFileName: string | null;
  backupPassword: string;
  passwordFieldError: string | null;
  loading: boolean;
  loadProgress: BackupZipParseProgress | null;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTryAnotherFile: () => void;
  t: Translator;
};

export function BackupZipPasswordPrompt({
  loadedFileName,
  backupPassword,
  passwordFieldError,
  loading,
  loadProgress,
  onPasswordChange,
  onSubmit,
  onTryAnotherFile,
  t,
}: Props) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/80 px-4 py-8 shadow-sm dark:border-white/12 dark:bg-white/[0.06] sm:px-8 sm:py-10">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-md flex-col items-center gap-4 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
          <Lock className="h-6 w-6" aria-hidden />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-100">
          <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('passwordPrompt.protectedBadge')}
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('passwordPrompt.title')}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {t('passwordPrompt.subtitle')}
          </p>
          {loadedFileName ? (
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {loadedFileName}
            </p>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
          {t('passwordPrompt.warning')}
        </p>
        <label className="w-full text-left">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('passwordPrompt.label')}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={backupPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-black/12 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2 disabled:opacity-60 dark:border-white/14 dark:bg-slate-950/40 dark:text-white"
            placeholder={t('passwordPrompt.placeholder')}
          />
        </label>
        {passwordFieldError ? (
          <p role="alert" className="w-full text-left text-sm text-red-700 dark:text-red-300">
            {passwordFieldError}
          </p>
        ) : null}
        {loading && loadProgress ? (
          <BackupZipLoadProgress stage={loadProgress} verifyingPassword={true} t={t} />
        ) : null}
        <button
          type="submit"
          disabled={loading || backupPassword.trim().length === 0}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          {t('passwordPrompt.submit')}
        </button>
        <button
          type="button"
          onClick={onTryAnotherFile}
          disabled={loading}
          className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline disabled:opacity-60 dark:text-slate-400"
        >
          {t('tryOtherFile')}
        </button>
      </form>
    </div>
  );
}
