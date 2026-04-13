'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemeToggleVariant = 'default' | 'grouped';

interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
}

const groupedBtn =
  'group h-full min-h-0 w-10 min-w-10 shrink-0 rounded-lg border-0 bg-transparent shadow-none ring-0 transition-colors hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/25';

const defaultBtn =
  'group h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl border border-black/8 bg-black/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] transition-[background-color,box-shadow] hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/12 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:bg-white/[0.1] dark:focus-visible:ring-white/20';

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
          className="h-[1.15rem] w-[1.15rem] text-indigo-600 transition-colors group-hover:text-indigo-700"
          strokeWidth={2}
          aria-hidden
        />
      )}
    </button>
  );
}
