import { Save, Undo2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';
import { Button } from '@/shared/ui';

import {
  getGraphLayoutSaveBarBottom,
  getGraphLayoutSaveDockButtonStyle,
  getGraphLayoutSaveDockStyle,
  GRAPH_LAYOUT_SAVE_BUTTON_SIZE,
  GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH,
  GRAPH_LAYOUT_SAVE_ICON_SIZE,
} from '../lib/graphLayoutSaveBarMetrics';

const compactButtonClassName = 'min-h-0 min-w-0 py-0';
const saveLabelStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  letterSpacing: 0.15,
  lineHeight: GRAPH_LAYOUT_SAVE_ICON_SIZE + 2,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
};

function dockIconSlot(icon: React.ReactNode) {
  return (
    <View
      style={{
        width: GRAPH_LAYOUT_SAVE_ICON_SIZE,
        height: GRAPH_LAYOUT_SAVE_ICON_SIZE,
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

  return (
    <View
      pointerEvents="box-none"
      accessibilityLabel={t('notesGraph.saveLayoutBar.hint')}
      style={{
        position: 'absolute',
        left: GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH,
        right: GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH,
        bottom: getGraphLayoutSaveBarBottom(bottomInset),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={getGraphLayoutSaveDockStyle(color)}>
        <Button
          color={color}
          variant="ghost"
          size="sm"
          shape="circle"
          iconOnly
          className={compactButtonClassName}
          accessibilityLabel={t('notesGraph.saveLayoutBar.discard')}
          icon={dockIconSlot(
            <Undo2
              size={GRAPH_LAYOUT_SAVE_ICON_SIZE}
              color={color.text.secondary}
              strokeWidth={2.2}
            />,
          )}
          disabled={controlsDisabled}
          onPress={() => {
            hapticLight();
            onDiscard();
          }}
          containerStyle={getGraphLayoutSaveDockButtonStyle(color, 'discard', true)}
        />

        <View
          style={{
            width: 1,
            height: GRAPH_LAYOUT_SAVE_BUTTON_SIZE - 10,
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
                  <Save
                    size={GRAPH_LAYOUT_SAVE_ICON_SIZE}
                    color={color.icon.onAccent}
                    strokeWidth={2.3}
                  />,
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
            ...getGraphLayoutSaveDockButtonStyle(color, 'save'),
            paddingHorizontal: 11,
          }}
        />
      </View>
    </View>
  );
}
