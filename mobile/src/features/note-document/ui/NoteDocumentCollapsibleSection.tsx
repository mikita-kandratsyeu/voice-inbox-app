import { ChevronDown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type NoteDocumentCollapsibleSectionProps = {
  color: Colors;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export const NoteDocumentCollapsibleSection = React.memo(function NoteDocumentCollapsibleSection({
  color,
  title,
  expanded,
  onToggle,
  children,
}: NoteDocumentCollapsibleSectionProps) {
  const { t } = useTranslation();
  const chevronRotation = useSharedValue(0);

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
      className="rounded-2xl border p-4"
      style={{
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
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
      >
        <Text
          className="min-w-0 flex-1 text-[15px] font-semibold leading-5"
          style={{ color: color.text.primary }}
          numberOfLines={2}
        >
          {title}
        </Text>
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
        <Animated.View entering={FadeIn.duration(140)} className="pt-3">
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
});
