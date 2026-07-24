import { Inbox } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SheetPickerRow } from '@/shared/ui';

import { FolderLucideIcon } from '../lib/folderLucideIcons';

type FolderPickerRowProps = {
  label: string;
  subtitle?: string;
  color: Colors;
  iconId?: string;
  inbox?: boolean;
  tintHex?: string;
  selected?: boolean;
  showSelectionCheck?: boolean;
  isLast?: boolean;
  onPress: () => void;
};

export function FolderPickerRow({
  label,
  subtitle,
  color,
  iconId,
  inbox = false,
  tintHex,
  isLast = false,
  selected = false,
  showSelectionCheck = false,
  onPress,
}: FolderPickerRowProps) {
  const leadingIconColor = tintHex ?? color.text.secondary;

  return (
    <SheetPickerRow
      label={label}
      subtitle={subtitle}
      color={color}
      accentHex={tintHex}
      selected={selected}
      showSelectionCheck={showSelectionCheck}
      isLast={isLast}
      onPress={onPress}
      tintedSubtitle={Boolean(tintHex)}
      icon={
        inbox ? (
          <Inbox size={18} color={leadingIconColor} strokeWidth={2} />
        ) : (
          <FolderLucideIcon
            iconId={iconId ?? 'briefcase'}
            size={18}
            color={leadingIconColor}
            strokeWidth={2}
          />
        )
      }
    />
  );
}
