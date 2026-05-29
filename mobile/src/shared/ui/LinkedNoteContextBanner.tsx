import { Inbox } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Folder } from '@/entities/folder/model/types';
import type { RecordClassification } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { type Colors, useAppTheme } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

export type LinkedNoteContext = {
  title: string;
  folder: Folder | null;
  folderId: string | null | undefined;
  classification?: RecordClassification;
};

type LinkedNoteContextBannerProps = {
  context: LinkedNoteContext;
  color: Colors;
};

export function LinkedNoteContextBanner({ context, color }: LinkedNoteContextBannerProps) {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const { isProActive } = useProEntitlement();

  const classificationLabel =
    context.classification && !context.folderId
      ? t(`classification.${context.classification}`)
      : null;

  const { folderTintHex, locationLabel, leadingFolderIconId, showInboxIcon } = useMemo(
    () =>
      resolveFolderListRowChrome({
        folder: context.folder,
        folderId: context.folderId,
        classification: context.classification,
        isProActive,
        scheme,
        labels: {
          inbox: t('tabs.inbox'),
          folderRemoved: t('folders.detailFolderRemoved'),
          classificationLabel,
        },
      }),
    [
      classificationLabel,
      context.classification,
      context.folder,
      context.folderId,
      isProActive,
      scheme,
      t,
    ],
  );

  const leadingIconColor = folderTintHex ?? color.text.secondary;
  const stripeColor = folderTintHex ?? color.border.default;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${context.title}, ${locationLabel}`}
      style={{
        backgroundColor: color.background.card,
        borderColor: color.border.default,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
        width: '100%',
      }}
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
            {context.title}
          </Text>
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {folderTintHex ? (
              <Text style={{ color: folderTintHex, fontWeight: '600' }}>{locationLabel}</Text>
            ) : (
              locationLabel
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}
