import type { LucideIcon } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SheetPickerRow } from '@/shared/ui';

type PrivateRemoteSheetPickerRowProps = {
  label: string;
  subtitle?: string;
  color: Colors;
  icon: LucideIcon;
  accentHex?: string;
  selected?: boolean;
  showSelectionCheck?: boolean;
  isLast?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
};

export function PrivateRemoteSheetPickerRow({
  label,
  subtitle,
  color,
  icon: Icon,
  accentHex,
  selected = false,
  showSelectionCheck = true,
  isLast = false,
  onPress,
  trailing,
}: PrivateRemoteSheetPickerRowProps) {
  const leadingIconColor = accentHex ?? color.text.secondary;

  return (
    <SheetPickerRow
      label={label}
      subtitle={subtitle}
      color={color}
      accentHex={accentHex}
      selected={selected}
      showSelectionCheck={showSelectionCheck}
      isLast={isLast}
      onPress={onPress}
      trailing={trailing}
      labelNumberOfLines={2}
      icon={<Icon size={18} color={leadingIconColor} strokeWidth={2} />}
    />
  );
}
