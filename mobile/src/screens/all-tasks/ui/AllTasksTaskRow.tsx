import { CheckCircle2, ChevronRight, Circle, PanelRightOpen } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import type { TaskWithRecord } from '../types';

const SWIPE_MAX = 96;
const SWIPE_OPEN_THRESHOLD = 52;
const CARD_RADIUS = 16;

type AllTasksTaskRowProps = {
  item: TaskWithRecord;
  color: Colors;
  openNoteLabel: string;
  onToggle: (recordId: string, taskId: string) => void;
  onOpenNote: (recordId: string) => void;
};

export const AllTasksTaskRow = React.memo(function AllTasksTaskRow({
  item,
  color,
  openNoteLabel,
  onToggle,
  onOpenNote,
}: AllTasksTaskRowProps) {
  const { task, recordId, recordTitle } = item;
  const translateX = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const openNoteFromSwipe = useCallback(() => {
    hapticLight();
    onOpenNote(recordId);
  }, [onOpenNote, recordId]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((e: PanGestureHandlerEventPayload) => {
      const x = e.translationX;
      if (x > 0) {
        translateX.value = 0;
      } else {
        translateX.value = Math.max(x, -SWIPE_MAX);
      }
    })
    .onEnd(() => {
      if (translateX.value < -SWIPE_OPEN_THRESHOLD) {
        scheduleOnRN(openNoteFromSwipe);
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 260, mass: 0.85 });
    });

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const underlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -SWIPE_OPEN_THRESHOLD, -SWIPE_MAX],
      [0, 0.55, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const handleToggle = () => {
    hapticLight();
    pressScale.value = withSequence(
      withTiming(0.97, { duration: 55 }),
      withSpring(1, { damping: 16, stiffness: 280 }),
    );
    onToggle(recordId, task.id);
  };

  const cardShadowStyle = {
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  };

  return (
    <View
      className="mx-4 mb-4"
      style={[
        cardShadowStyle,
        { borderRadius: CARD_RADIUS, backgroundColor: color.background.card },
      ]}
    >
      <View style={{ overflow: 'hidden', borderRadius: CARD_RADIUS }}>
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 flex-row items-center justify-end px-4"
          style={[
            {
              backgroundColor: color.background.tertiary,
              borderRadius: CARD_RADIUS,
            },
            underlayStyle,
          ]}
        >
          <PanelRightOpen size={26} color={color.accent.primary} strokeWidth={2} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={slideStyle}>
            <View
              className="flex-row items-stretch px-3 py-2.5"
              style={{ backgroundColor: color.background.card, borderRadius: CARD_RADIUS }}
            >
              <Animated.View
                className="min-w-0 flex-1 flex-row items-center gap-3 py-1"
                style={[pressAnimStyle, { minWidth: 0 }]}
              >
                <Pressable
                  className="min-w-0 flex-1 flex-row items-center gap-3"
                  onPress={handleToggle}
                  style={{ minWidth: 0 }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.isDone }}
                  accessibilityLabel={task.text}
                >
                  {task.isDone ? (
                    <CheckCircle2 size={22} color={color.accent.success} strokeWidth={2} />
                  ) : (
                    <Circle size={22} color={color.icon.muted} strokeWidth={2} />
                  )}
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[15px] leading-5"
                      style={{
                        color: task.isDone ? color.text.secondary : color.text.primary,
                        textDecorationLine: task.isDone ? 'line-through' : undefined,
                      }}
                      numberOfLines={3}
                    >
                      {task.text}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs"
                      style={{ color: color.text.secondary }}
                      numberOfLines={1}
                    >
                      {recordTitle}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
              <Pressable
                className="justify-center pl-1"
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 4 }}
                onPress={() => {
                  hapticLight();
                  onOpenNote(recordId);
                }}
                accessibilityRole="button"
                accessibilityLabel={openNoteLabel}
              >
                <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
});
