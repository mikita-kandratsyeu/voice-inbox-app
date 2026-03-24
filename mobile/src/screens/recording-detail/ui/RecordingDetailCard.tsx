import { Inbox } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatRelativeTime, withAlphaHex } from '@/shared/lib';

import { RecordDetailTag } from './RecordDetailTag';

export type RecordingDetailFolderPlacement =
  | { kind: 'inbox' }
  | { kind: 'missing' }
  | { kind: 'folder'; folder: Folder; tintHex: string };

type RecordingDetailCardProps = {
  record: VoiceRecord;
  color: Colors;
  folderPlacement: RecordingDetailFolderPlacement;
};

export const RecordingDetailCard = ({
  record,
  color,
  folderPlacement,
}: RecordingDetailCardProps) => {
  const { t, i18n } = useTranslation();
  const dateStr = record.createdAt ? formatRelativeTime(record.createdAt, i18n.language) : '';
  const tagsStr = record.tags && record.tags.length > 0 ? record.tags.join(', ') : '';
  const baseLabel = t('recordingDetail.accessibility.cardLabel', {
    title: record.title,
    date: dateStr,
    duration: record.duration,
  });
  const accessibilityLabel = tagsStr
    ? baseLabel + t('recordingDetail.accessibility.tagsSuffix', { tags: tagsStr })
    : baseLabel;

  return (
    <View
      className="gap-2 rounded-2xl p-4"
      style={{ backgroundColor: color.background.card }}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text
          className="flex-1 text-xl font-bold tracking-tight min-w-0"
          style={{ color: color.text.primary }}
          numberOfLines={2}
        >
          {record.title}
        </Text>
        {record.status === 'archived' && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: color.accent.archive,
            }}
          >
            <Text style={{ fontSize: 12, color: color.icon.onAccent, fontWeight: '500' }}>
              {t('inbox.filters.archived')}
            </Text>
          </View>
        )}
        {record.classification && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text style={{ fontSize: 12, color: color.text.secondary }}>
              {t(`classification.${record.classification}`)}
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 2,
        }}
        accessibilityRole="text"
        accessibilityLabel={
          folderPlacement.kind === 'inbox'
            ? t('folders.detailA11yInbox')
            : folderPlacement.kind === 'missing'
              ? t('folders.detailFolderRemoved')
              : t('folders.detailA11yFolder', { name: folderPlacement.folder.name })
        }
      >
        {folderPlacement.kind === 'inbox' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Inbox size={16} color={color.text.secondary} strokeWidth={2} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}>
              {t('folders.detailInbox')}
            </Text>
          </View>
        ) : null}
        {folderPlacement.kind === 'missing' ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: color.text.muted }}>
              {t('folders.detailFolderRemoved')}
            </Text>
          </View>
        ) : null}
        {folderPlacement.kind === 'folder' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              maxWidth: '100%',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: withAlphaHex(folderPlacement.tintHex, 0.18),
              borderWidth: 1,
              borderColor: withAlphaHex(folderPlacement.tintHex, 0.4),
            }}
          >
            <FolderLucideIcon
              iconId={folderPlacement.folder.icon}
              size={18}
              color={folderPlacement.tintHex}
              strokeWidth={2}
            />
            <Text
              style={{
                flexShrink: 1,
                fontSize: 13,
                fontWeight: '600',
                color: color.text.primary,
              }}
              numberOfLines={1}
            >
              {folderPlacement.folder.name}
            </Text>
          </View>
        ) : null}
      </View>

      {record.tags && record.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {record.tags.map((tag) => (
            <RecordDetailTag key={tag} label={tag} />
          ))}
        </View>
      )}
      {record.createdAt && (
        <Text className="mt-0.5 text-xs" style={{ color: color.text.secondary }}>
          {formatRelativeTime(record.createdAt, i18n.language)}
        </Text>
      )}
    </View>
  );
};
