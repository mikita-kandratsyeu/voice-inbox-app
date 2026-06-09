import { clearGraphSessionLayout } from './graphSessionLayout';
import { clearNotesGraphLayoutCache } from './notesGraphLayoutCache';
import { releaseNotesGraphScreenBodyPrefetch } from './prefetchNotesGraphScreenBody';

/** Drop in-memory graph layout, drag session, and prefetched screen module. */
export function unloadNotesGraphScreen(): void {
  clearGraphSessionLayout();
  clearNotesGraphLayoutCache();
  releaseNotesGraphScreenBodyPrefetch();
}
