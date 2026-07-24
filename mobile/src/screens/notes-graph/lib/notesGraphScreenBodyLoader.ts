type NotesGraphScreenBodyModule = typeof import('../ui/NotesGraphScreenBody');

export function loadNotesGraphScreenBodyModule(): Promise<NotesGraphScreenBodyModule> {
  return import('../ui/NotesGraphScreenBody');
}
