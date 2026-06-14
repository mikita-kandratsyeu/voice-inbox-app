import { RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib/haptics';
import { FILTER_CHIP_LABEL_STYLE, filterChipRowStyle } from '@/shared/ui/filterChipMetrics';

import type { GraphExportBackgroundId } from '../lib/graphExportBackground';
import {
  getGraphExportControlTone,
  GRAPH_EXPORT_CONTROL_HEIGHT,
} from '../lib/graphExportControlTone';
import { CROP_ASPECT_TEMPLATES, type CropAspectTemplateId } from '../lib/graphExportCrop';
import { GraphExportBackgroundSelector } from './GraphExportBackgroundSelector';

type GraphExportCropTemplatesProps = {
  color: Colors;
  activeTemplateId: CropAspectTemplateId;
  backgroundId: GraphExportBackgroundId;
  canReset: boolean;
  disabled?: boolean;
  onBackgroundSelect: (backgroundId: GraphExportBackgroundId) => void;
  onReset: () => void;
  onSelect: (templateId: Exclude<CropAspectTemplateId, 'custom'>) => void;
};

const TEMPLATE_LABEL_KEYS: Record<
  Exclude<CropAspectTemplateId, 'custom'>,
  | 'cropTemplateFull'
  | 'cropTemplateSquare'
  | 'cropTemplatePortrait'
  | 'cropTemplateLandscape'
  | 'cropTemplateStory'
> = {
  full: 'cropTemplateFull',
  '1:1': 'cropTemplateSquare',
  '4:5': 'cropTemplatePortrait',
  '16:9': 'cropTemplateLandscape',
  '9:16': 'cropTemplateStory',
};

const RESET_BUTTON_SIZE = GRAPH_EXPORT_CONTROL_HEIGHT;

export function GraphExportCropTemplates({
  color,
  activeTemplateId,
  backgroundId,
  canReset,
  disabled = false,
  onBackgroundSelect,
  onReset,
  onSelect,
}: GraphExportCropTemplatesProps) {
  const { t } = useTranslation();
  const resetTone = getGraphExportControlTone(color, {
    isActive: canReset,
    disabled,
  });
  const resetInteractionDisabled = disabled || !canReset;

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notesGraph.export.resetCrop')}
        accessibilityState={{ disabled: resetInteractionDisabled }}
        disabled={resetInteractionDisabled}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => {
          hapticLight();
          onReset();
        }}
        style={{
          alignItems: 'center',
          backgroundColor: resetTone.backgroundColor,
          borderColor: resetTone.borderColor,
          borderRadius: RESET_BUTTON_SIZE / 2,
          borderWidth: 1,
          height: RESET_BUTTON_SIZE,
          justifyContent: 'center',
          opacity: resetTone.opacity,
          width: RESET_BUTTON_SIZE,
        }}
      >
        <RotateCcw color={resetTone.iconColor} size={15} strokeWidth={2.2} />
      </Pressable>

      <GraphExportBackgroundSelector
        color={color}
        disabled={disabled}
        onSelect={onBackgroundSelect}
        value={backgroundId}
      />

      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: color.border.default,
          marginVertical: 4,
          width: 1,
        }}
      />

      <ScrollView
        horizontal
        contentContainerStyle={{ alignItems: 'center', gap: 8, paddingRight: 2 }}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {CROP_ASPECT_TEMPLATES.map((template) => {
          const isActive = activeTemplateId === template.id;
          const labelKey = TEMPLATE_LABEL_KEYS[template.id];
          const backgroundColor = isActive ? color.accent.primary : color.background.tertiary;

          return (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: isActive }}
              disabled={disabled}
              onPress={() => {
                hapticLight();
                onSelect(template.id);
              }}
              style={[
                filterChipRowStyle(backgroundColor),
                { marginRight: 0, opacity: disabled ? 0.45 : 1 },
              ]}
            >
              <Text
                style={{
                  ...FILTER_CHIP_LABEL_STYLE,
                  color: isActive ? color.icon.onAccent : color.text.primary,
                }}
              >
                {t(`notesGraph.export.${labelKey}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
