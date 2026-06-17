'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { utilitiesGroupedActionBaseClass } from '@/components/ui/utilities-shell';

type ThemeToggleVariant = 'default' | 'grouped' | 'compact';

interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
}

const compactBtn =
  'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

const groupedBtn = `${utilitiesGroupedActionBaseClass} w-10 min-w-10 shadow-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/25`;

const defaultBtn =
  'h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl border border-black/8 bg-black/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] transition-[background-color,box-shadow] hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/12 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.1] dark:focus-visible:ring-white/20';

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps): React.ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  const btnClass =
    variant === 'grouped'
      ? `flex cursor-pointer items-center justify-center ${groupedBtn}`
      : variant === 'compact'
        ? compactBtn
        : `flex cursor-pointer items-center justify-center ${defaultBtn}`;

  if (!mounted) {
    return (
      <button type="button" aria-label="Toggle theme" className={btnClass}>
        <Moon
          className="h-[1.15rem] w-[1.15rem] text-indigo-600 transition-colors dark:text-slate-300"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={btnClass}
    >
      {isDark ? (
        <Sun className="h-[1.15rem] w-[1.15rem] text-amber-200" strokeWidth={2} aria-hidden />
      ) : (
        <Moon
          className="h-[1.15rem] w-[1.15rem] text-indigo-600 dark:text-slate-300"
          strokeWidth={2}
          aria-hidden
        />
      )}
    </button>
  );
}
