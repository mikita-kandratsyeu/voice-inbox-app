import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { useFadeInEntering } from '@/shared/config';
import { hapticSelection, isDarkSurfaceColor, withAlphaHex } from '@/shared/lib';

import { resolveNoteDocumentSectionIcon } from '../lib/noteDocumentSectionIconUi';

type NoteDocumentCollapsibleSectionVariant = 'card' | 'reading';

type NoteDocumentCollapsibleSectionProps = {
  color: Colors;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: NoteDocumentCollapsibleSectionVariant;
  sectionId?: string;
};

function resolveSectionIcon(sectionId?: string): LucideIcon | null {
  return resolveNoteDocumentSectionIcon(sectionId);
}

export const NoteDocumentCollapsibleSection = React.memo(function NoteDocumentCollapsibleSection({
  color,
  title,
  expanded,
  onToggle,
  children,
  variant = 'card',
  sectionId,
}: NoteDocumentCollapsibleSectionProps) {
  const { t } = useTranslation();
  const sectionExpandEntering = useFadeInEntering(140);
  const chevronRotation = useSharedValue(0);
  const SectionIcon = resolveSectionIcon(sectionId);
  const isReading = variant === 'reading';
  const isDark = isDarkSurfaceColor(color);
  const iconChipBackground = withAlphaHex(color.text.secondary, isDark ? 0.16 : 0.09);
  const iconColor = color.accent.primary;
  const iconChipAccentBackground = withAlphaHex(color.accent.primary, isDark ? 0.14 : 0.1);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 0 : -90, {
      duration: 120,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  return (
    <View
      accessible={false}
      className={isReading ? undefined : 'rounded-2xl border p-4'}
      style={
        isReading
          ? {
              borderTopWidth: 1,
              borderTopColor: color.border.default,
              paddingTop: 20,
            }
          : {
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('recordingDetail.document.sections.collapseA11y', { title })
            : t('recordingDetail.document.sections.expandA11y', { title })
        }
        onPress={() => {
          hapticSelection();
          onToggle();
        }}
        className="flex-row items-center justify-between gap-3 active:opacity-80"
        style={isReading ? { paddingBottom: expanded ? 12 : 4 } : undefined}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          {SectionIcon ? (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: isReading ? iconChipBackground : iconChipAccentBackground,
                borderRadius: 8,
                height: 28,
                justifyContent: 'center',
                width: 28,
              }}
            >
              <SectionIcon size={15} color={iconColor} strokeWidth={2.1} />
            </View>
          ) : null}
          <Text
            className="min-w-0 flex-1 font-semibold"
            style={{
              color: color.text.primary,
              fontSize: isReading ? 17 : 15,
              letterSpacing: isReading ? -0.2 : 0,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        <Animated.View
          style={[
            chevronAnimatedStyle,
            {
              width: 28,
              height: 28,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ChevronDown size={16} color={color.text.secondary} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <Animated.View entering={sectionExpandEntering} style={{ paddingTop: isReading ? 0 : 12 }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
});
