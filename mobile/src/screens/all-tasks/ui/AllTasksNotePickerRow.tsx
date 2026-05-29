import { ChevronRight, Inbox } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { type FolderIconKey, FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Folder as FolderModel } from '@/entities/folder/model/types';
import type { RecordClassification, RecordListItem } from '@/entities/record';
import { type Colors, useAppTheme } from '@/shared/config';
import { hapticSelection, resolveFolderColorForCurrentScheme, withAlphaHex } from '@/shared/lib';

const MAX_VISIBLE_TAGS = 2;

const CLASSIFICATION_FOLDER_ICON: Record<RecordClassification, FolderIconKey> = {
  work: 'briefcase',
  personal: 'home',
  meeting: 'globe',
  idea: 'lightbulb',
  other: 'star',
};

type AllTasksNotePickerRowProps = {
  record: RecordListItem;
  folder: FolderModel | null;
  color: Colors;
  isLast?: boolean;
  onPress: () => void;
};

function buildTagSummary(tags: string[], moreLabel: string): string | null {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hidden = tags.length - visible.length;
  const joined = visible.join(', ');
  if (hidden <= 0) return joined;
  return `${joined} ${moreLabel}`;
}

export function AllTasksNotePickerRow({
  record,
  folder,
  color,
  isLast = false,
  onPress,
}: AllTasksNotePickerRowProps) {
  const { t } = useTranslation();
  const scheme = useAppTheme();

  const tags = record.tags ?? [];

  const folderTintHex = useMemo(() => {
    if (!folder) return undefined;
    return resolveFolderColorForCurrentScheme(folder.color, scheme);
  }, [folder, scheme]);

  const classificationLabel =
    record.classification && !record.folderId ? t(`classification.${record.classification}`) : null;

  const locationLabel = folder
    ? folder.name
    : record.folderId
      ? t('folders.detailFolderRemoved')
      : classificationLabel
        ? classificationLabel
        : t('tabs.inbox');

  const tagSummary = buildTagSummary(
    tags,
    t('allTasks.pickNoteMoreTags', { count: tags.length - MAX_VISIBLE_TAGS }),
  );

  const leadingIconColor = folderTintHex ?? color.text.secondary;
  const leadingFolderIconId = folder
    ? folder.icon
    : record.classification && !record.folderId
      ? CLASSIFICATION_FOLDER_ICON[record.classification]
      : null;
  const showInboxIcon = !folder && !record.folderId && !record.classification;

  const accessibilityLabel = useMemo(() => {
    const parts = [record.title, locationLabel];
    if (tagSummary) parts.push(tagSummary);
    return parts.join(', ');
  }, [locationLabel, record.title, tagSummary]);

  const stripeColor = folderTintHex ?? color.border.default;

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.background.tertiary : 'transparent',
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: 56,
          paddingHorizontal: 14,
          paddingVertical: 12,
          width: '100%',
        }}
      >
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: stripeColor,
            borderRadius: 2,
            flexShrink: 0,
            width: 3,
          }}
        />
        <View
          style={{
            alignItems: 'center',
            backgroundColor: folderTintHex
              ? withAlphaHex(folderTintHex, 0.1)
              : color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          {showInboxIcon ? (
            <Inbox size={18} color={leadingIconColor} strokeWidth={2} />
          ) : (
            <FolderLucideIcon
              iconId={leadingFolderIconId ?? 'briefcase'}
              size={18}
              color={leadingIconColor}
              strokeWidth={2}
            />
          )}
        </View>
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={1}
          >
            {record.title}
          </Text>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 4,
              marginTop: 3,
              minWidth: 0,
            }}
          >
            <Text
              style={{
                color: color.text.secondary,
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              {folder && folderTintHex ? (
                <Text style={{ color: folderTintHex, fontWeight: '600' }}>{locationLabel}</Text>
              ) : (
                locationLabel
              )}
              {tagSummary ? ` · ${tagSummary}` : null}
            </Text>
          </View>
        </View>
        <View style={{ flexShrink: 0, marginLeft: 2 }}>
          <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}
