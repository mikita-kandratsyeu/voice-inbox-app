import { Save, Undo2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View, type ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight, selectPlatform, withAlphaHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

const BUTTON_SIZE = 34;
const ICON_SIZE = 14;
const SIDE_GUTTER = 16;
const GRAPH_CONTROL_SIZE = 40;
const DOCK_PADDING_H = 5;
const DOCK_PADDING_V = 4;
/** Info / zoom columns — keeps the dock in the bottom center gap. */
const CORNER_COLUMN_WIDTH = GRAPH_CONTROL_SIZE + SIDE_GUTTER;
const DOCK_HEIGHT = BUTTON_SIZE + DOCK_PADDING_V * 2;

const dockShadowStyle = (color: Colors) =>
  selectPlatform({
    ios: {
      shadowColor: color.shadow.color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: color.shadow.opacity * 1.6,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  });

function dockButtonContainerStyle(
  color: Colors,
  role: 'discard' | 'save',
  iconOnly = false,
): ViewStyle {
  const base: ViewStyle = {
    minHeight: BUTTON_SIZE,
    height: BUTTON_SIZE,
    minWidth: iconOnly ? BUTTON_SIZE : 0,
    width: iconOnly ? BUTTON_SIZE : undefined,
    paddingHorizontal: iconOnly ? 0 : 10,
    paddingVertical: 0,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (role === 'discard') {
    return {
      ...base,
      backgroundColor: withAlphaHex(color.text.primary, 0.06),
    };
  }

  return {
    ...base,
    backgroundColor: color.accent.primary,
  };
}

const compactButtonClassName = 'min-h-0 min-w-0 py-0';
const saveLabelStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  letterSpacing: 0.1,
  lineHeight: ICON_SIZE,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
};

function dockIconSlot(icon: React.ReactNode) {
  return (
    <View
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </View>
  );
}

type GraphLayoutSaveBarProps = {
  color: Colors;
  bottomInset: number;
  isSaving?: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function GraphLayoutSaveBar({
  color,
  bottomInset,
  isSaving = false,
  disabled = false,
  onSave,
  onDiscard,
}: GraphLayoutSaveBarProps) {
  const { t } = useTranslation();
  const controlsDisabled = disabled || isSaving;
  const bottom = bottomInset + SIDE_GUTTER;

  return (
    <View
      pointerEvents="box-none"
      accessibilityLabel={t('notesGraph.saveLayoutBar.hint')}
      style={{
        position: 'absolute',
        left: CORNER_COLUMN_WIDTH,
        right: CORNER_COLUMN_WIDTH,
        bottom,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          height: DOCK_HEIGHT,
          paddingLeft: DOCK_PADDING_H,
          paddingRight: DOCK_PADDING_H - 1,
          paddingVertical: DOCK_PADDING_V,
          borderRadius: DOCK_HEIGHT / 2,
          backgroundColor: color.background.primary,
          borderWidth: 1,
          borderColor: color.border.default,
          ...dockShadowStyle(color),
        }}
      >
        <Button
          color={color}
          variant="ghost"
          size="sm"
          shape="circle"
          iconOnly
          className={compactButtonClassName}
          accessibilityLabel={t('notesGraph.saveLayoutBar.discard')}
          icon={dockIconSlot(
            <Undo2 size={ICON_SIZE} color={color.text.secondary} strokeWidth={2.2} />,
          )}
          disabled={controlsDisabled}
          onPress={() => {
            hapticLight();
            onDiscard();
          }}
          containerStyle={dockButtonContainerStyle(color, 'discard', true)}
        />

        <View
          style={{
            width: 1,
            height: BUTTON_SIZE - 10,
            borderRadius: 1,
            backgroundColor: color.border.default,
          }}
        />

        <Button
          color={color}
          variant="primary"
          size="sm"
          iconOnly
          className={compactButtonClassName}
          accessibilityLabel={t('notesGraph.saveChangesA11y')}
          icon={
            isSaving ? (
              <ActivityIndicator size="small" color={color.icon.onAccent} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {dockIconSlot(
                  <Save size={ICON_SIZE} color={color.icon.onAccent} strokeWidth={2.3} />,
                )}
                <Text style={[saveLabelStyle, { color: color.icon.onAccent }]}>
                  {t('notesGraph.saveLayoutBar.save')}
                </Text>
              </View>
            )
          }
          disabled={controlsDisabled}
          onPress={() => {
            hapticLight();
            onSave();
          }}
          containerStyle={{
            ...dockButtonContainerStyle(color, 'save'),
            paddingHorizontal: 11,
          }}
        />
      </View>
    </View>
  );
}
