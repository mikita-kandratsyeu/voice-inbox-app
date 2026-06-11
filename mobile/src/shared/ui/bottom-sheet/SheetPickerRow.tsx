import { Check, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { SheetRowIconLeading } from './SheetRowIconLeading';

type SheetPickerRowProps = {
  label: string;
  subtitle?: string;
  color: Colors;
  accentHex?: string;
  icon: React.ReactNode;
  selected?: boolean;
  showSelectionCheck?: boolean;
  isLast?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
  /** @default 1 */
  labelNumberOfLines?: number;
  /** Tint subtitle text with accent color (folder picker). */
  tintedSubtitle?: boolean;
};

export function SheetPickerRow({
  label,
  subtitle,
  color,
  accentHex,
  icon,
  selected = false,
  showSelectionCheck = true,
  isLast = false,
  onPress,
  trailing,
  labelNumberOfLines = 1,
  tintedSubtitle = false,
}: SheetPickerRowProps) {
  const selectionTrailing =
    showSelectionCheck && selected ? (
      <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
    ) : (
      <ChevronRight size={18} color={color.text.muted} strokeWidth={2.2} />
    );

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
      accessibilityState={{ selected }}
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
          minHeight: 52,
          paddingHorizontal: 14,
          paddingVertical: 12,
          width: '100%',
        }}
      >
        <SheetRowIconLeading icon={icon} color={color} accentHex={accentHex} />
        <View style={{ flex: 1, flexShrink: 1, justifyContent: 'center', minWidth: 0 }}>
          <Text
            style={{ color: color.text.primary, fontSize: 16, fontWeight: '600', lineHeight: 21 }}
            numberOfLines={labelNumberOfLines}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: color.text.secondary,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              {tintedSubtitle && accentHex ? (
                <Text style={{ color: accentHex, fontWeight: '600' }}>{subtitle}</Text>
              ) : (
                subtitle
              )}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexShrink: 0, alignItems: 'center', gap: 8 }}>
          {trailing}
          {selectionTrailing}
        </View>
      </View>
    </Pressable>
  );
}
