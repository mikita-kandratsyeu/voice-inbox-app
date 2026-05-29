import { Check, ChevronRight, Inbox } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, withAlphaHex } from '@/shared/lib';

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
  const stripeColor = tintHex ?? color.border.default;
  const leadingIconColor = tintHex ?? color.text.secondary;

  const trailing =
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
            backgroundColor: tintHex
              ? withAlphaHex(tintHex, 0.1)
              : color.background.tertiary,
            borderRadius: 10,
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
        >
          {inbox ? (
            <Inbox size={18} color={leadingIconColor} strokeWidth={2} />
          ) : (
            <FolderLucideIcon
              iconId={iconId ?? 'briefcase'}
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
              {tintHex ? (
                <Text style={{ color: tintHex, fontWeight: '600' }}>{subtitle}</Text>
              ) : (
                subtitle
              )}
            </Text>
          ) : null}
        </View>
        <View style={{ flexShrink: 0, marginLeft: 2 }}>{trailing}</View>
      </View>
    </Pressable>
  );
}
