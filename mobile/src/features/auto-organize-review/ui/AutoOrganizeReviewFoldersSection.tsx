import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { folderIconComponents, parseFolderIconKey } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import { DEFAULT_FOLDER_BRAND_HEX } from '@/shared/lib';
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
  return (
    <>
      <SectionHeader title={folderSectionLabel} isFirst />
      <View
        style={{
          marginBottom: 16,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.card,
        }}
      >
        {reviewFolders.map((item, idx) => {
          const isProposed = item.kind === 'proposed';
          const folderId = isProposed ? item.folder.tempId : item.folder.id;
          const folderName = item.folder.name.trim();
          const folderColor =
            isProposed && !isProActive
              ? DEFAULT_FOLDER_BRAND_HEX
              : item.folder.color || DEFAULT_FOLDER_BRAND_HEX;
          const IconComp = folderIconComponents[parseFolderIconKey(item.folder.icon)];
          const noteCount = isProposed
            ? (proposedFolderNoteCountByTempId.get(item.folder.tempId) ?? 0)
            : (existingFolderNoteCountById.get(item.folder.id) ?? 0);

          return (
            <Pressable
              key={`${item.kind}-${folderId}`}
              onPress={() => onPressFolder(item)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: idx < reviewFolders.length - 1 ? 1 : 0,
                borderBottomColor: color.border.default,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color.background.tertiary,
                  borderWidth: 1,
                  borderColor: color.border.default,
                }}
              >
                <IconComp size={20} color={folderColor} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: color.text.primary }}
                  numberOfLines={1}
                >
                  {folderName || unnamedFolderLabel}
                </Text>
                <Text
                  style={{ marginTop: 2, fontSize: 13, color: color.text.secondary }}
                  numberOfLines={1}
                >
                  {getFolderNoteCountLabel(noteCount)}
                </Text>
              </View>
              <ChevronRight size={18} color={color.text.secondary} strokeWidth={2.4} />
            </Pressable>
          );
        })}
        {reviewFolders.length === 0 && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, color: color.text.secondary }}>{noFoldersLabel}</Text>
          </View>
        )}
      </View>
    </>
  );
};
