import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Inbox, Link2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { VoiceRecord } from '@/entities/record';
import { useRecordBacklinks } from '@/features/note-links';
import { useNoteLinkRowData } from '@/features/note-links/lib/useNoteLinkRowData';
import { useRelatedNotes } from '@/features/related-notes';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import type { Colors } from '@/shared/config';
import { hapticSelection, hapticSuccess, withAlphaHex } from '@/shared/lib';

type RelatedNotesSectionProps = {
  recordId: string;
  color: Colors;
  linkedRecordIds?: string[];
  canLink?: boolean;
  onLinkToRecord?: (targetId: string) => void;
};

type RelatedNoteRowProps = {
  record: VoiceRecord;
  folder: Folder | null;
  color: Colors;
  isLast: boolean;
  showLinkButton: boolean;
  onPress: () => void;
  onLink?: () => void;
};

function RelatedNoteRow({
  record,
  folder,
  color,
  isLast,
  showLinkButton,
  onPress,
  onLink,
}: RelatedNoteRowProps) {
  const { t } = useTranslation();

  const {
    folderTintHex,
    locationLabel,
    leadingFolderIconId,
    showInboxIcon,
    leadingIconColor,
    stripeColor,
    dateLabel,
    summaryPreview,
    accessibilityLabel,
  } = useNoteLinkRowData({ record, folder, color });

  const displayTitle = record.title?.trim() || getAutoTitleForDate(record.createdAt);

  return (
    <View
      style={{
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
      }}
    >
      <Pressable
        onPress={() => {
          hapticSelection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          backgroundColor: pressed ? color.background.tertiary : 'transparent',
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
              {displayTitle}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: color.text.secondary,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              {folder && folderTintHex ? (
                <Text style={{ color: folderTintHex, fontWeight: '600' }}>{locationLabel}</Text>
              ) : (
                locationLabel
              )}
              {dateLabel ? ` · ${dateLabel}` : null}
            </Text>
            {summaryPreview ? (
              <Text
                numberOfLines={2}
                style={{
                  color: color.text.secondary,
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                {summaryPreview}
              </Text>
            ) : null}
          </View>
          {showLinkButton && onLink ? (
            <Pressable
              onPress={() => {
                hapticSuccess();
                onLink();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('noteLinks.linkA11y', { title: displayTitle })}
              hitSlop={6}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? withAlphaHex(color.accent.primary, 0.2)
                  : withAlphaHex(color.accent.primary, 0.12),
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 8,
                  flexShrink: 0,
                  marginRight: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
              >
                <Link2 size={12} color={color.accent.primary} strokeWidth={2.2} />
                <Text
                  style={{
                    color: color.accent.primary,
                    fontSize: 13,
                    fontWeight: '600',
                    lineHeight: 18,
                  }}
                >
                  {t('noteLinks.link')}
                </Text>
              </View>
            </Pressable>
          ) : null}
          <View style={{ flexShrink: 0, marginLeft: 2 }}>
            <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export const RelatedNotesSection = ({
  recordId,
  color,
  linkedRecordIds = [],
  canLink = false,
  onLinkToRecord,
}: RelatedNotesSectionProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const backlinkIds = useRecordBacklinks(recordId);
  const excludeRecordIds = useMemo(
    () => [...linkedRecordIds, ...backlinkIds],
    [backlinkIds, linkedRecordIds],
  );
  const relatedNotes = useRelatedNotes(recordId, 5, excludeRecordIds);
  const folders = useFolderStore(useShallow((s) => s.folders));

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const linkedSet = useMemo(() => new Set(linkedRecordIds), [linkedRecordIds]);

  if (relatedNotes.length === 0) return null;

  const handlePress = (record: VoiceRecord) => {
    navigation.push('RecordingDetail', { record });
  };

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.6,
          paddingHorizontal: 2,
          textTransform: 'uppercase',
        }}
      >
        {t('recordingDetail.relatedNotes')}
      </Text>
      <View
        style={{
          backgroundColor: color.background.card,
          borderColor: color.border.default,
          borderRadius: 12,
          borderWidth: 1,
          overflow: 'hidden',
        }}
      >
        {relatedNotes.map((record, index) => {
          const showLinkButton = canLink && !!onLinkToRecord && !linkedSet.has(record.id);

          return (
            <RelatedNoteRow
              key={record.id}
              record={record}
              folder={record.folderId ? (folderById.get(record.folderId) ?? null) : null}
              color={color}
              isLast={index === relatedNotes.length - 1}
              showLinkButton={showLinkButton}
              onPress={() => handlePress(record)}
              onLink={
                showLinkButton && onLinkToRecord ? () => onLinkToRecord(record.id) : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
};
