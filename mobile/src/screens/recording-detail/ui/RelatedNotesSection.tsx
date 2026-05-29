import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Inbox } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { VoiceRecord } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { useRelatedNotes } from '@/features/related-notes';
import { type Colors, useAppTheme } from '@/shared/config';
import { formatRelativeTime, hapticSelection, withAlphaHex } from '@/shared/lib';

type RelatedNotesSectionProps = {
  recordId: string;
  color: Colors;
};

type RelatedNoteRowProps = {
  record: VoiceRecord;
  folder: Folder | null;
  color: Colors;
  isLast: boolean;
  onPress: () => void;
};

function RelatedNoteRow({ record, folder, color, isLast, onPress }: RelatedNoteRowProps) {
  const { t, i18n } = useTranslation();
  const scheme = useAppTheme();
  const { isProActive } = useProEntitlement();

  const classificationLabel =
    record.classification && !record.folderId ? t(`classification.${record.classification}`) : null;

  const { folderTintHex, locationLabel, leadingFolderIconId, showInboxIcon } = useMemo(
    () =>
      resolveFolderListRowChrome({
        folder,
        folderId: record.folderId,
        classification: record.classification,
        isProActive,
        scheme,
        labels: {
          inbox: t('tabs.inbox'),
          folderRemoved: t('folders.detailFolderRemoved'),
          classificationLabel,
        },
      }),
    [classificationLabel, folder, isProActive, record.classification, record.folderId, scheme, t],
  );

  const leadingIconColor = folderTintHex ?? color.text.secondary;
  const stripeColor = folderTintHex ?? color.border.default;

  const dateLabel = record.createdAt ? formatRelativeTime(record.createdAt, i18n.language) : null;

  const summaryPreview = record.summary?.replace(/\s+/g, ' ').trim();

  const accessibilityLabel = [record.title, locationLabel, dateLabel, summaryPreview]
    .filter(Boolean)
    .join(', ');

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
        <View style={{ flexShrink: 0, marginLeft: 2 }}>
          <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

export const RelatedNotesSection = ({ recordId, color }: RelatedNotesSectionProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const relatedNotes = useRelatedNotes(recordId, 5);
  const folders = useFolderStore(useShallow((s) => s.folders));

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  if (relatedNotes.length === 0) return null;

  const handlePress = (record: VoiceRecord) => {
    navigation.push('RecordingDetail', { record });
  };

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
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
        {relatedNotes.map((record, index) => (
          <RelatedNoteRow
            key={record.id}
            record={record}
            folder={record.folderId ? (folderById.get(record.folderId) ?? null) : null}
            color={color}
            isLast={index === relatedNotes.length - 1}
            onPress={() => handlePress(record)}
          />
        ))}
      </View>
    </View>
  );
};
