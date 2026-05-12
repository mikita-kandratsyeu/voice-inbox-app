import { MenuView } from '@react-native-menu/menu';
import { Bookmark, ChevronDown, MoreHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, LayoutAnimation, Platform, Pressable, Text, View } from 'react-native';
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
    chevronRotation.value = withTiming(marksExpanded ? 0 : -90, {
      duration: 120,
      easing: marksExpanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
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
        className="gap-2.5 rounded-2xl p-4"
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
          <View className="min-w-0 flex-1 flex-row items-center gap-2" accessible={false}>
            <Bookmark size={18} color={color.icon.muted} strokeWidth={2} />
            <Text
              className="min-w-0 flex-1 text-sm font-medium"
              style={{ color: color.text.primary }}
            >
              {t('recordingDetail.marksSectionTitle')}
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
        {marksExpanded ? (
          <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
            className="gap-2.5"
          >
            {sorted.map((mark) => {
              const timeStr = formatTime(Math.floor(mark.offsetMs / 1000));
              const title = mark.label.trim() || t('recordingDetail.markUntitled');
              return (
                <View
                  key={mark.id}
                  className="flex-row items-center gap-2.5 rounded-2xl px-3 py-3.5"
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
                      className="min-w-[56px] justify-center rounded-md px-1.5"
                      style={{
                        backgroundColor: color.accent.primary,
                        minHeight: 26,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        className="text-center text-[12px] font-semibold tabular-nums"
                        style={[
                          { color: color.icon.onAccent, lineHeight: 16 },
                          Platform.OS === 'android'
                            ? {
                                textAlignVertical: 'center',
                                includeFontPadding: false,
                              }
                            : null,
                        ]}
                      >
                        {timeStr}
                      </Text>
                    </View>
                    <Text
                      className="flex-1 text-[15px] font-medium leading-6"
                      style={{ color: color.text.primary }}
                      numberOfLines={2}
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
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        style={({ pressed }) => ({
                          height: 44,
                          width: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 999,
                          backgroundColor: color.background.tertiary,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <MoreHorizontal size={20} color={color.text.primary} strokeWidth={2.5} />
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
