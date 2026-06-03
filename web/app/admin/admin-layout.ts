/** Horizontal gutters for admin main column (shared by header + body). */
export const adminMainGutterXClass = 'px-3 sm:px-4 md:px-6 lg:px-8';

/** Centered column — same max width as the header card outer box. */
export const adminMainContainerClass = 'mx-auto w-full max-w-screen-2xl';

/** Padding inside the sticky header card only (not applied to page body). */
export const adminMainInsetClass = 'px-3 sm:px-4';

/** Sticky header card surface (admin zinc palette). */
export const adminHeaderShellClass =
  'rounded-2xl border border-zinc-200/90 bg-white/90 shadow-sm shadow-zinc-950/5 backdrop-blur-md dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:shadow-black/20';

const adminScrollRowBaseClass =
  'flex gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Scroll row inside the header card (pairs with {@link adminMainInsetClass}). */
export const adminHeaderScrollRowClass = `-mx-3 ${adminScrollRowBaseClass} px-3 pb-0.5 sm:-mx-4 sm:px-4`;

/** Scroll row in the main column (pairs with {@link adminMainGutterXClass}). */
export const adminMainScrollRowClass = `-mx-3 ${adminScrollRowBaseClass} px-3 pb-0.5 sm:-mx-4 sm:px-4 md:mx-0 md:overflow-visible md:px-0 md:pb-0`;
