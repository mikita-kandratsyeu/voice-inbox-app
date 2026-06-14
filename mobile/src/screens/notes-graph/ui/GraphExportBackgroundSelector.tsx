import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Palette } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import { FILTER_CHIP_LABEL_STYLE, FILTER_CHIP_MIN_HEIGHT } from '@/shared/ui/filterChipMetrics';

import {
  GRAPH_EXPORT_CANVAS_BACKGROUND_ID,
  GRAPH_EXPORT_COLOR_BACKGROUND_IDS,
  type GraphExportBackgroundId,
  graphExportBackgroundLabelKey,
  isGraphExportBackgroundId,
} from '../lib/graphExportBackground';

type GraphExportBackgroundSelectorProps = {
  value: GraphExportBackgroundId;
  color: Colors;
  disabled?: boolean;
  onSelect: (backgroundId: GraphExportBackgroundId) => void;
};

export function GraphExportBackgroundSelector({
  value,
  color,
  disabled = false,
  onSelect,
}: GraphExportBackgroundSelectorProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  const label = t(`notesGraph.export.${graphExportBackgroundLabelKey(value)}`);
  const accessibilityLabel = `${t('notesGraph.export.backgroundLabel')}: ${label}`;
  const isDefaultBackground = value === GRAPH_EXPORT_CANVAS_BACKGROUND_ID;

  const menuActions = useMemo<NativeMenuAction[]>(
    () => [
      {
        id: GRAPH_EXPORT_CANVAS_BACKGROUND_ID,
        title: t(
          `notesGraph.export.${graphExportBackgroundLabelKey(GRAPH_EXPORT_CANVAS_BACKGROUND_ID)}`,
        ),
        titleColor: color.text.primary,
        state: value === GRAPH_EXPORT_CANVAS_BACKGROUND_ID ? 'on' : 'off',
      },
      inlineNativeMenuSection(
        'colorBackgroundsSection',
        color.text.primary,
        GRAPH_EXPORT_COLOR_BACKGROUND_IDS.map((backgroundId) => ({
          id: backgroundId,
          title: t(`notesGraph.export.${graphExportBackgroundLabelKey(backgroundId)}`),
          titleColor: color.text.primary,
          state: backgroundId === value ? 'on' : 'off',
        })),
      ),
    ],
    [color.text.primary, t, value],
  );

  return (
    <MenuView
      key={theme}
      themeVariant={isDark ? 'dark' : 'light'}
      onPressAction={({ nativeEvent }) => {
        if (disabled) return;
        hapticSelection();
        const next = nativeEvent.event;
        if (isGraphExportBackgroundId(next)) {
          onSelect(next);
        }
      }}
      actions={menuActions}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('notesGraph.export.backgroundHint')}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={{
          alignItems: 'center',
          backgroundColor: isDefaultBackground ? color.background.tertiary : color.background.card,
          borderColor: color.border.default,
          borderRadius: FILTER_CHIP_MIN_HEIGHT / 2,
          borderWidth: 1,
          flex: 1,
          flexDirection: 'row',
          gap: 6,
          height: FILTER_CHIP_MIN_HEIGHT,
          justifyContent: 'center',
          maxWidth: '100%',
          minWidth: 0,
          opacity: disabled ? 0.45 : 1,
          paddingHorizontal: 12,
        }}
      >
        <Palette
          color={isDefaultBackground ? color.text.muted : color.accent.primary}
          size={15}
          strokeWidth={2.2}
        />
        <Text
          numberOfLines={1}
          style={{
            ...FILTER_CHIP_LABEL_STYLE,
            color: isDefaultBackground ? color.text.muted : color.text.primary,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
        <ChevronDown color={color.text.secondary} size={15} strokeWidth={2.2} />
      </Pressable>
    </MenuView>
  );
}
