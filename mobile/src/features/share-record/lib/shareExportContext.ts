import { useFolderStore } from '@/entities/folder';

/** Convention for opening a note in the app (handler may be added later). */
export function buildRecordDeepLink(recordId: string): string {
  return `voiceinbox://note/${recordId}`;
}

export type ShareExportContext = {
  folderNameById?: Record<string, string>;
};

export function resolveShareExportContext(override?: ShareExportContext): ShareExportContext {
  if (override?.folderNameById) {
    return override;
  }
  const folders = useFolderStore.getState().folders;
  const folderNameById: Record<string, string> = {};
  for (const f of folders) {
    folderNameById[f.id] = f.name;
  }
  return { folderNameById };
}
