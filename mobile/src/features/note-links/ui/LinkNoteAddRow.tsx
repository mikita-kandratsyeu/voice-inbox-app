import { Link2, Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, isDarkSurfaceColor, withAlphaHex } from '@/shared/lib';

type LinkNoteAddRowProps = {
  color: Colors;
  hasLinks: boolean;
  isLast: boolean;
  onPress: () => void;
};

export function LinkNoteAddRow({ color, hasLinks, isLast, onPress }: LinkNoteAddRowProps) {
  const { t } = useTranslation();
  const surfaceDark = isDarkSurfaceColor(color);
  const accent = color.accent.primary;
  const iconBackground = withAlphaHex(accent, surfaceDark ? 0.2 : 0.12);

  const title = hasLinks ? t('noteLinks.linkNoteAddAnother') : t('noteLinks.linkNote');
  const hint = hasLinks ? undefined : t('noteLinks.linkNoteHint');

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? color.background.tertiary
          : hasLinks
            ? 'transparent'
            : color.background.tertiary,
        borderBottomColor: color.border.default,
        borderBottomWidth: isLast ? 0 : 1,
        borderTopColor: color.border.default,
        borderTopWidth: hasLinks ? 1 : 0,
        width: '100%',
      })}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: hasLinks ? 48 : 56,
          paddingHorizontal: 14,
          paddingVertical: hasLinks ? 10 : 12,
          width: '100%',
        }}
      >
        {!hasLinks && (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: iconBackground,
              borderRadius: 10,
              flexShrink: 0,
              height: 36,
              justifyContent: 'center',
              width: 36,
            }}
          >
            <Link2 size={18} color={accent} strokeWidth={2.2} />
          </View>
        )}
        <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
          <Text
            style={{
              color: color.text.primary,
              fontSize: hasLinks ? 15 : 16,
              fontWeight: '600',
              lineHeight: hasLinks ? 20 : 21,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {hint ? (
            <Text
              numberOfLines={2}
              style={{
                color: color.text.secondary,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        <View style={{ alignSelf: 'center', flexShrink: 0 }}>
          <Plus size={18} color={accent} strokeWidth={2.25} />
        </View>
      </View>
    </Pressable>
  );
}
