import { useFolderStore } from '@/entities/folder';

export type ShareExportContext = {
  folderNameById?: Record<string, string>;
  /** Omit note metadata and duplicate title — used for HTML/plain email bodies. */
  forEmail?: boolean;
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
