/** Shared pill shell for theme / locale / admin header actions (landing + admin). */

export const utilitiesShellClass =
  'flex h-11 shrink-0 items-stretch gap-1 rounded-2xl border border-black/8 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.06]';

export const utilitiesShellDividerClass =
  'mx-0.5 h-6 w-px shrink-0 self-center bg-black/10 dark:bg-white/12';

/** Full-height control inside {@link utilitiesShellClass} (locale trigger, theme toggle, etc.). */
export const utilitiesGroupedActionBaseClass =
  'h-full min-h-9 shrink-0 self-stretch rounded-lg border-0 bg-transparent';

export const utilitiesGroupedActionClass = `inline-flex ${utilitiesGroupedActionBaseClass} items-center gap-1.5 px-2.5 text-sm font-medium leading-none text-black/80 shadow-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:text-white/85 dark:focus-visible:ring-white/25 sm:px-3`;

export const utilitiesMenuClass =
  'absolute right-0 top-full z-50 mt-1.5 flex min-w-38 flex-col gap-1 overflow-hidden rounded-xl border border-black/8 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]';

export const utilitiesMenuItemClass =
  'flex min-h-10 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium leading-snug text-black dark:text-white';

export const utilitiesMenuItemSelectedClass = 'bg-black/[0.05] dark:bg-white/[0.1]';
