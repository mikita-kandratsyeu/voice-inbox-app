import React from 'react';
import { Text, View } from 'react-native';

import { FolderPickerRow } from '@/entities/folder/ui/FolderPickerRow';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveFolderListTintHex } from '@/shared/lib';
import { SectionHeader } from '@/shared/ui';

import type { ReviewFolderItem } from '../model/useAutoOrganizeReview';

type Props = {
  color: Colors;
  isProActive: boolean;
  reviewFolders: ReviewFolderItem[];
  proposedFolderNoteCountByTempId: Map<string, number>;
  existingFolderNoteCountById: Map<string, number>;
  onPressFolder: (item: ReviewFolderItem) => void;
  noFoldersLabel: string;
  unnamedFolderLabel: string;
  folderSectionLabel: string;
  getFolderNoteCountLabel: (count: number) => string;
};

export const AutoOrganizeReviewFoldersSection = ({
  color,
  isProActive,
  reviewFolders,
  proposedFolderNoteCountByTempId,
  existingFolderNoteCountById,
  onPressFolder,
  noFoldersLabel,
  unnamedFolderLabel,
  folderSectionLabel,
  getFolderNoteCountLabel,
}: Props) => {
  const scheme = useAppTheme();

  return (
    <>
      <SectionHeader title={folderSectionLabel} isFirst />
      <View
        style={{
          marginBottom: 16,
          backgroundColor: color.background.card,
          borderColor: color.border.default,
          borderRadius: 12,
          borderWidth: 1,
          overflow: 'hidden',
        }}
      >
        {reviewFolders.map((item, idx) => {
          const isProposed = item.kind === 'proposed';
          const folderId = isProposed ? item.folder.tempId : item.folder.id;
          const folderName = item.folder.name.trim();
          const tintHex = resolveFolderListTintHex(item.folder.color, isProActive, scheme);
          const noteCount = isProposed
            ? (proposedFolderNoteCountByTempId.get(item.folder.tempId) ?? 0)
            : (existingFolderNoteCountById.get(item.folder.id) ?? 0);

          return (
            <FolderPickerRow
              key={`${item.kind}-${folderId}`}
              label={folderName || unnamedFolderLabel}
              subtitle={getFolderNoteCountLabel(noteCount)}
              color={color}
              iconId={item.folder.icon}
              tintHex={tintHex}
              isLast={idx === reviewFolders.length - 1}
              onPress={() => onPressFolder(item)}
            />
          );
        })}
        {reviewFolders.length === 0 && (
          <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: color.text.secondary }}>{noFoldersLabel}</Text>
          </View>
        )}
      </View>
    </>
  );
};
