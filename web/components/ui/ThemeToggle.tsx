'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5"
      >
        <span className="h-5 w-5" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-black/5 transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-white" aria-hidden />
      ) : (
        <Moon className="h-5 w-5 text-black" aria-hidden />
      )}
    </button>
  );
}
