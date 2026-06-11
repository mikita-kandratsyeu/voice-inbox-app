import { Check } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUTO_ORGANIZE_TEMPLATES,
  type AutoOrganizeTemplate,
  isProAutoOrganizeTemplate,
} from '@/entities/folder/lib/autoOrganizeTypes';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib/haptics';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  ProCrownBadge,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { getAiOrganizeTemplateSheetSnapHeight } from '../lib/aiOrganizeSheetLayout';

type AiOrganizeTemplateSheetProps = {
  visible: boolean;
  selectedTemplate: AutoOrganizeTemplate;
  isProActive: boolean;
  onClose: () => void;
  onBack: () => void;
  onSelect: (template: AutoOrganizeTemplate) => void;
  onApply: () => void;
  onProRequired: () => void;
};

export function AiOrganizeTemplateSheet({
  visible,
  selectedTemplate,
  isProActive,
  onClose,
  onBack,
  onSelect,
  onApply,
  onProRequired,
}: AiOrganizeTemplateSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(
    () => [getAiOrganizeTemplateSheetSnapHeight(insets.bottom, AUTO_ORGANIZE_TEMPLATES.length)],
    [insets.bottom],
  );

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      snapPoints={snapPoints}
      enableContentPanningGesture={false}
    >
      <AppBottomSheetContent style={{ flexGrow: 0 }} bottomPadding={12}>
        <SheetHeader
          title={t('folders.aiOrganizeTemplates.title')}
          subtitle={t('folders.aiOrganizeTemplates.subtitle')}
          color={color}
          marginBottom={14}
        />

        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
          }}
        >
          {AUTO_ORGANIZE_TEMPLATES.map((template, index) => {
            const selected = template === selectedTemplate;
            const isPro = isProAutoOrganizeTemplate(template);
            const locked = isPro && !isProActive;

            return (
              <TouchableOpacity
                key={template}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`folders.aiOrganizeTemplates.items.${template}`)}
                onPress={() => {
                  hapticSelection();
                  if (locked) {
                    onProRequired();
                    return;
                  }
                  onSelect(template);
                }}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index < AUTO_ORGANIZE_TEMPLATES.length - 1 ? 1 : 0,
                  borderBottomColor: color.border.default,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, color: color.text.primary }}>
                        {t(`folders.aiOrganizeTemplates.items.${template}`)}
                      </Text>
                      {locked ? <ProCrownBadge /> : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        color: color.text.muted,
                        marginTop: 4,
                      }}
                    >
                      {t(`folders.aiOrganizeTemplates.hints.${template}`)}
                    </Text>
                  </View>
                  {selected && !locked ? (
                    <Check size={18} color={color.accent.primary} strokeWidth={2.6} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SheetFooterButtons
          className="mt-3 w-full"
          color={color}
          primaryLabel={t('folders.aiOrganizeTemplates.apply')}
          onPrimaryPress={() => {
            const locked = isProAutoOrganizeTemplate(selectedTemplate) && !isProActive;
            if (locked) {
              onProRequired();
              return;
            }
            onApply();
          }}
          primaryAccessibilityLabel={t('folders.aiOrganizeTemplates.applyA11y')}
          secondaryLabel={t('common.goBack')}
          onSecondaryPress={onBack}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
