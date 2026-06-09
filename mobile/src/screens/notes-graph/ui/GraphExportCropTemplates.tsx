import { RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib/haptics';
import {
  FILTER_CHIP_LABEL_STYLE,
  FILTER_CHIP_MIN_HEIGHT,
  filterChipRowStyle,
} from '@/shared/ui/filterChipMetrics';

import { CROP_ASPECT_TEMPLATES, type CropAspectTemplateId } from '../lib/graphExportCrop';

type GraphExportCropTemplatesProps = {
  color: Colors;
  activeTemplateId: CropAspectTemplateId;
  canReset: boolean;
  disabled?: boolean;
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

const RESET_BUTTON_SIZE = FILTER_CHIP_MIN_HEIGHT;

export function GraphExportCropTemplates({
  color,
  activeTemplateId,
  canReset,
  disabled = false,
  onReset,
  onSelect,
}: GraphExportCropTemplatesProps) {
  const { t } = useTranslation();
  const controlsDisabled = disabled || !canReset;

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
        accessibilityState={{ disabled: controlsDisabled }}
        disabled={controlsDisabled}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => {
          hapticLight();
          onReset();
        }}
        style={{
          alignItems: 'center',
          backgroundColor: canReset ? color.background.card : color.background.tertiary,
          borderColor: color.border.default,
          borderRadius: RESET_BUTTON_SIZE / 2,
          borderWidth: 1,
          height: RESET_BUTTON_SIZE,
          justifyContent: 'center',
          opacity: controlsDisabled ? 0.45 : 1,
          width: RESET_BUTTON_SIZE,
        }}
      >
        <RotateCcw
          color={canReset ? color.accent.primary : color.text.muted}
          size={15}
          strokeWidth={2.2}
        />
      </Pressable>

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
