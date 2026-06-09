import { loadNotesGraphScreenBodyModule } from './notesGraphScreenBodyLoader';

type NotesGraphScreenBodyModule = typeof import('../ui/NotesGraphScreenBody');

let prefetchPromise: Promise<NotesGraphScreenBodyModule> | null = null;
let prefetchedModule: NotesGraphScreenBodyModule | null = null;

export function prefetchNotesGraphScreenBody(): Promise<NotesGraphScreenBodyModule> {
  if (prefetchedModule) {
    return Promise.resolve(prefetchedModule);
  }

  if (!prefetchPromise) {
    prefetchPromise = loadNotesGraphScreenBodyModule().then((mod) => {
      prefetchedModule = mod;
      return mod;
    });
  }

  return prefetchPromise;
}

export function getPrefetchedNotesGraphScreenBody():
  | NotesGraphScreenBodyModule['NotesGraphScreenBody']
  | null {
  return prefetchedModule?.NotesGraphScreenBody ?? null;
}

export function releaseNotesGraphScreenBodyPrefetch(): void {
  prefetchPromise = null;
  prefetchedModule = null;
}
