import { getNotesGraphLayoutAutoName } from './getNotesGraphLayoutAutoName';

export function resolveNotesGraphLayoutSaveName(draft: string): string {
  return draft.trim() || getNotesGraphLayoutAutoName();
}
