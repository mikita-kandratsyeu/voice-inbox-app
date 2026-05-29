import type { RecordClassification } from '@/entities/record';
import type { ColorScheme } from '@/shared/config';
import { resolveFolderListTintHex } from '@/shared/lib/folderColor';

import type { FolderIconKey } from './folderLucideIcons';

export const CLASSIFICATION_FOLDER_ICON: Record<RecordClassification, FolderIconKey> = {
  work: 'briefcase',
  personal: 'home',
  meeting: 'globe',
  idea: 'lightbulb',
  other: 'star',
};

export type FolderListRowChromeLabels = {
  inbox: string;
  folderRemoved: string;
  /** Pre-translated; only when `classification` is set and note has no folder. */
  classificationLabel: string | null;
};

export type FolderListRowChromeInput = {
  folder: { color: string; icon: string; name: string } | null;
  folderId: string | null | undefined;
  classification?: RecordClassification;
  isProActive: boolean;
  scheme: ColorScheme;
  labels: FolderListRowChromeLabels;
};

export type FolderListRowChrome = {
  folderTintHex: string | undefined;
  locationLabel: string;
  leadingFolderIconId: string | null;
  showInboxIcon: boolean;
};

/** Shared leading icon, location line, and Pro-gated tint for folder list rows. */
export function resolveFolderListRowChrome(input: FolderListRowChromeInput): FolderListRowChrome {
  const { folder, folderId, classification, isProActive, scheme, labels } = input;

  const folderTintHex = folder
    ? resolveFolderListTintHex(folder.color, isProActive, scheme)
    : undefined;

  const locationLabel = folder
    ? folder.name
    : folderId
      ? labels.folderRemoved
      : (labels.classificationLabel ?? labels.inbox);

  const leadingFolderIconId = folder
    ? folder.icon
    : classification && !folderId
      ? CLASSIFICATION_FOLDER_ICON[classification]
      : null;

  const showInboxIcon = !folder && !folderId && !classification;

  return {
    folderTintHex,
    locationLabel,
    leadingFolderIconId,
    showInboxIcon,
  };
}
