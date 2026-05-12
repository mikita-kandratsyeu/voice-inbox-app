import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, MoreHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { RecordingMark } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { formatTime, hapticSelection } from '@/shared/lib';

import { TaskEditSheet } from './TaskEditSheet';

const MARK_LABEL_MAX = 280;

type RecordingMarksSectionProps = {
  marks: RecordingMark[];
  color: Colors;
  surfaceBackgroundColor?: string;
  onSeekMs: (ms: number) => void;
  onUpdateMarks: (next: RecordingMark[]) => void;
};

export const RecordingMarksSection = ({
  marks,
  color,
  surfaceBackgroundColor,
  onSeekMs,
  onUpdateMarks,
}: RecordingMarksSectionProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const [editMark, setEditMark] = useState<RecordingMark | null>(null);
  const [marksExpanded, setMarksExpanded] = useState(true);
  const chevronRotation = useSharedValue(0);

  const sorted = useMemo(() => [...marks].sort((a, b) => a.offsetMs - b.offsetMs), [marks]);

  useEffect(() => {
    if (marksExpanded) {
      chevronRotation.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      chevronRotation.value = -90;
    }
  }, [chevronRotation, marksExpanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const confirmDeleteMark = useCallback(
    (mark: RecordingMark) => {
      Alert.alert(t('recordingDetail.markDeleteTitle'), t('recordingDetail.markDeleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onUpdateMarks(marks.filter((m) => m.id !== mark.id));
          },
        },
      ]);
    },
    [marks, onUpdateMarks, t],
  );

  const handleEditSave = useCallback(
    ({ text }: { text: string }): boolean => {
      if (!editMark) return false;
      const label = text.trim().slice(0, MARK_LABEL_MAX);
      onUpdateMarks(marks.map((m) => (m.id === editMark.id ? { ...m, label } : m)));
      setEditMark(null);
      return true;
    },
    [editMark, marks, onUpdateMarks],
  );

  if (sorted.length === 0) {
    return null;
  }

  const cardBg = surfaceBackgroundColor ?? color.background.card;

  return (
    <>
      <View
        accessible={false}
        className="gap-2 rounded-2xl p-4"
        style={{ backgroundColor: cardBg }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: marksExpanded }}
          accessibilityLabel={
            marksExpanded
              ? t('recordingDetail.marksCollapseA11y')
              : t('recordingDetail.marksExpandA11y')
          }
          accessibilityHint={t('recordingDetail.marksSectionA11y', { count: sorted.length })}
          onPress={() => {
            hapticSelection();
            setMarksExpanded((v) => {
              if (!v) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
              return !v;
            });
          }}
          className="flex-row items-center justify-between gap-3 pb-0.5 active:opacity-80"
        >
          <Text
            className="min-w-0 flex-1 text-[12px] font-semibold uppercase tracking-wide"
            style={{ color: color.text.muted }}
          >
            {t('recordingDetail.marksSectionTitle')}
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
            <ChevronDown size={16} color={color.text.secondary} strokeWidth={2.25} />
          </Animated.View>
        </Pressable>
        {marksExpanded ? (
          <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
            className="gap-2"
          >
            {sorted.map((mark) => {
              const timeStr = formatTime(Math.floor(mark.offsetMs / 1000));
              const title = mark.label.trim() || t('recordingDetail.markUntitled');
              return (
                <View
                  key={mark.id}
                  className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: color.background.tertiary }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('recordingDetail.markSeekA11y', {
                      time: timeStr,
                      title,
                    })}
                    onPress={() => {
                      hapticSelection();
                      onSeekMs(mark.offsetMs);
                    }}
                    className="min-w-0 flex-1 flex-row items-center gap-3"
                  >
                    <View
                      className="rounded-lg px-2 py-1"
                      style={{ backgroundColor: color.background.secondary }}
                    >
                      <Text
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ color: color.text.secondary }}
                      >
                        {timeStr}
                      </Text>
                    </View>
                    <Text
                      className="flex-1 text-[15px] font-medium leading-5"
                      style={{ color: color.text.primary }}
                      numberOfLines={3}
                    >
                      {title}
                    </Text>
                  </Pressable>
                  <View style={{ flexShrink: 0 }}>
                    <MenuView
                      key={`mark-menu-${mark.id}-${theme}`}
                      title=""
                      themeVariant={isDark ? 'dark' : 'light'}
                      shouldOpenOnLongPress={false}
                      onPressAction={({ nativeEvent }) => {
                        hapticSelection();
                        if (nativeEvent.event === 'editMark') {
                          setEditMark(mark);
                        }
                        if (nativeEvent.event === 'deleteMark') {
                          confirmDeleteMark(mark);
                        }
                      }}
                      actions={[
                        {
                          id: 'editMark',
                          title: t('recordingDetail.markEdit'),
                          image: 'pencil',
                          imageColor: color.text.primary,
                          titleColor: color.text.primary,
                        },
                        {
                          id: 'deleteMark',
                          title: t('common.delete'),
                          image: 'trash',
                          imageColor: color.accent.delete,
                          titleColor: color.accent.delete,
                          attributes: { destructive: true },
                        },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('recordingDetail.markMoreA11y')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                          height: 40,
                          width: 40,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 999,
                          backgroundColor: color.background.secondary,
                        }}
                      >
                        <MoreHorizontal size={20} color={color.text.secondary} strokeWidth={2} />
                      </Pressable>
                    </MenuView>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        ) : null}
      </View>

      <TaskEditSheet
        visible={editMark !== null}
        initialText={editMark?.label ?? ''}
        sheetTitleKey="recordingDetail.markEditTitle"
        placeholderKey="recordingDetail.markLabelPlaceholder"
        onClose={() => setEditMark(null)}
        onSave={handleEditSave}
      />
    </>
  );
};
