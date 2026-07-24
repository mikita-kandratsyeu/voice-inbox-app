import { Inbox, Tag } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

type RecordCardLocationChipProps = {
  label: string;
  color: Colors;
  accentColor?: string;
  folderIconId?: string;
  showInboxIcon?: boolean;
};

export const RecordCardLocationChip = memo(function RecordCardLocationChip({
  label,
  color,
  accentColor,
  folderIconId,
  showInboxIcon = false,
}: RecordCardLocationChipProps) {
  const isFolder = Boolean(folderIconId);
  const iconColor = accentColor ?? color.text.secondary;
  const backgroundColor = accentColor ? withAlphaHex(accentColor, 0.14) : color.background.tertiary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
        maxWidth: '100%',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor,
        ...(isFolder && accentColor
          ? {
              borderWidth: 1,
              borderColor: withAlphaHex(accentColor, 0.28),
            }
          : null),
      }}
      accessibilityRole="text"
    >
      {folderIconId ? (
        <FolderLucideIcon iconId={folderIconId} size={12} color={iconColor} strokeWidth={2.2} />
      ) : showInboxIcon ? (
        <Inbox size={12} color={iconColor} strokeWidth={2.2} />
      ) : (
        <Tag size={12} color={iconColor} strokeWidth={2.2} />
      )}
      <Text
        style={{
          flexShrink: 1,
          fontSize: 11,
          fontWeight: '600',
          color: isFolder ? color.text.primary : iconColor,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});
