import { ChevronDown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type ExpandableSectionProps = {
  color: Colors;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  containerStyle?: 'bordered' | 'transparent';
};

export function ExpandableSection({
  color,
  title,
  expanded,
  onToggle,
  children,
  containerStyle = 'bordered',
}: ExpandableSectionProps) {
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 180 : 0, {
      duration: 120,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleToggle = () => {
    hapticSelection();
    onToggle();
  };

  if (containerStyle === 'transparent') {
    return (
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={title}
          onPress={handleToggle}
          className="-mx-1 flex-row items-center justify-between gap-2 rounded-xl px-1 py-1.5"
          style={{ minHeight: 36 }}
        >
          <Text
            className="min-w-0 flex-1 text-[13px] font-medium"
            style={{ color: color.text.secondary }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Animated.View
            style={[
              chevronStyle,
              {
                width: 28,
                height: 28,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <ChevronDown size={18} color={color.text.secondary} strokeWidth={2.2} />
          </Animated.View>
        </Pressable>
        {expanded ? children : null}
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl border"
      style={{ borderColor: color.border.default, backgroundColor: color.background.secondary }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        onPress={handleToggle}
        className="flex-row items-center justify-between gap-3 px-4 py-3"
        style={{ minHeight: 44 }}
      >
        <Text
          className="min-w-0 flex-1 text-sm font-semibold"
          style={{ color: color.text.primary }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Animated.View
          style={[
            chevronStyle,
            {
              width: 32,
              height: 32,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ChevronDown size={20} color={color.text.secondary} strokeWidth={2.2} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <View
          className="border-t px-4 pb-3 pt-2.5"
          style={{ borderTopColor: color.border.default }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
