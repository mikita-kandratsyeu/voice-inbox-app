import { ChevronRight, Inbox, X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { VoiceRecord } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { type Colors, useAppTheme } from '@/shared/config';
import { formatRelativeTime, hapticSelection, withAlphaHex } from '@/shared/lib';

type NoteLinkRowProps = {
  record: VoiceRecord;
  folder: Folder | null;
  color: Colors;
  isLast: boolean;
  onPress: () => void;
  onUnlink?: () => void;
};

export function NoteLinkRow({
  record,
  folder,
  color,
  isLast,
  onPress,
  onUnlink,
}: NoteLinkRowProps) {
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
        <View style={{ alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 8 }}>
          {onUnlink ? (
            <Pressable
              onPress={() => {
                hapticSelection();
                onUnlink();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('noteLinks.unlinkA11y', { title: record.title })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? color.background.tertiary : 'transparent',
                borderRadius: 8,
                justifyContent: 'center',
                padding: 4,
              })}
            >
              <X size={18} color={color.text.muted} strokeWidth={2.2} />
            </Pressable>
          ) : null}
          <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}
