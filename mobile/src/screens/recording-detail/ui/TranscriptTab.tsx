import { MenuView } from '@react-native-menu/menu';
import {
  AlignLeft,
  ChevronDown,
  Eye,
  Languages,
  Pencil,
  RefreshCw,
  Trash2,
  Undo2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TranscriptSegment } from '@/entities/record';
import {
  getWhisperModelVariantId,
  TRANSLATE_LANGUAGES,
  useSettingsStore,
} from '@/entities/settings';
import { getWhisperModelDisplayName } from '@/entities/settings/model/constants';
import { TranscriptHighlight } from '@/features/transcript-highlight';
import { useTranscriptionBlockedForRecord } from '@/features/transcription';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { Button, RecordVoiceIcon, TabEmptyState } from '@/shared/ui';

type TranscriptTabProps = {
  recordId: string;
  segments: TranscriptSegment[];
  translatedTranscript?: string;
  translationLanguage?: string;
  currentPositionMs?: number;
  color: Colors;
  hasAudio: boolean;
  onTranscribe: () => void;
  onDiscardResume?: () => void;
  onEditTranscript: () => void;
  onTranslate?: (targetLanguage: string) => Promise<boolean>;
  onDeleteTranslation?: () => void;
  isTranslating?: boolean;
  isAiProcessing?: boolean;
  isPrivateMode?: boolean;
  resumeAvailable?: boolean;
  isDiscardingResume?: boolean;
};

const MAX_PARAGRAPH_LENGTH = 360;

const buildReadableParagraphs = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) =>
      part
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  const single = paragraphs[0] ?? '';
  if (single.length <= MAX_PARAGRAPH_LENGTH) {
    return single ? [single] : [];
  }

  const sentences = single
    .split(/(?<=[.!?])\s+(?=[A-ZА-ЯЁІЇЄҐ0-9])/u)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [single];
  }

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= MAX_PARAGRAPH_LENGTH) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [single];
};

export const TranscriptTab = ({
  recordId,
  segments,
  translatedTranscript,
  translationLanguage,
  currentPositionMs = 0,
  color,
  hasAudio,
  onTranscribe,
  onEditTranscript,
  onTranslate,
  onDeleteTranslation,
  isTranslating = false,
  isAiProcessing = false,
  isPrivateMode = false,
  resumeAvailable = false,
  isDiscardingResume = false,
}: TranscriptTabProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);
  const chevronRotation = useSharedValue(0);
  const hasTranslation = Boolean(translatedTranscript?.trim());

  useEffect(() => {
    setViewMode('original');
  }, [recordId]);

  useEffect(() => {
    if (!hasTranslation) {
      setViewMode('original');
    }
  }, [hasTranslation]);

  useEffect(() => {
    chevronRotation.value = withTiming(transcriptExpanded ? 0 : -90, {
      duration: 120,
      easing: transcriptExpanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, transcriptExpanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const whisperVariantId = getWhisperModelVariantId(
    selectedWhisperModel,
    selectedWhisperModelFormat,
  );
  const whisperStatus = whisperModelStatuses[whisperVariantId] ?? 'not_downloaded';
  const transcriptionBlocked = useTranscriptionBlockedForRecord(recordId);
  const transcribeDisabled = isAiProcessing || transcriptionBlocked || isDiscardingResume;

  const showTranslation = hasTranslation && viewMode === 'translated';
  const translatedParagraphs = buildReadableParagraphs(translatedTranscript ?? '');
  const hint =
    whisperStatus === 'not_downloaded'
      ? undefined
      : getWhisperModelDisplayName(selectedWhisperModel, selectedWhisperModelFormat);
  const originalTextParagraphs = buildReadableParagraphs(
    segments
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join('\n\n'),
  );

  if (segments.length === 0) {
    return (
      <TabEmptyState
        icon={<RecordVoiceIcon size={28} color={color.icon.muted} strokeWidth={1.9} />}
        title={
          resumeAvailable
            ? t('transcription.resumeTitle')
            : t('recordingDetail.transcriptNotCreated')
        }
        description={
          resumeAvailable
            ? t('transcription.pausedNotificationBodyFallback')
            : t('recordingDetail.transcriptNotCreatedDesc')
        }
        buttonLabel={
          resumeAvailable ? t('transcription.continue') : t('recordingDetail.transcribe')
        }
        buttonIcon={<RecordVoiceIcon size={18} color="#fff" strokeWidth={2.2} />}
        hint={hint}
        onPress={onTranscribe}
        hideButton={!hasAudio}
        disabled={transcribeDisabled}
        loading={isDiscardingResume}
      />
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        {hasTranslation && !isPrivateMode && (
          <Button
            variant="secondary"
            size="lg"
            icon={
              showTranslation ? (
                <Undo2 size={15} color={color.text.primary} strokeWidth={2} />
              ) : (
                <Eye size={15} color={color.text.primary} strokeWidth={2} />
              )
            }
            label={
              showTranslation
                ? t('recordingDetail.showOriginal')
                : t('recordingDetail.showTranslation', {
                    lang: translationLanguage
                      ? t(
                          `recordingDetail.language.${translationLanguage}` as 'recordingDetail.language.ru',
                        )
                      : '',
                  })
            }
            color={color}
            onPress={() => setViewMode(showTranslation ? 'original' : 'translated')}
          />
        )}
        {(onTranslate || (hasTranslation && onDeleteTranslation)) &&
          segments.length > 0 &&
          !isPrivateMode && (
            <MenuView
              key={theme}
              themeVariant={isDark ? 'dark' : 'light'}
              onPressAction={async ({ nativeEvent }) => {
                const action = nativeEvent.event;
                if (action === 'deleteTranslation') {
                  onDeleteTranslation?.();
                  return;
                }
                if (onTranslate && (TRANSLATE_LANGUAGES as readonly string[]).includes(action)) {
                  const ok = await onTranslate(action);

                  if (ok) {
                    setViewMode('translated');
                  }
                }
              }}
              actions={[
                ...(onTranslate
                  ? TRANSLATE_LANGUAGES.map((lang) => ({
                      id: lang,
                      title: t(`recordingDetail.language.${lang}`),
                      titleColor: color.text.primary,
                    }))
                  : []),
                ...(hasTranslation && onDeleteTranslation
                  ? [
                      {
                        id: 'deleteTranslation',
                        title: t('recordingDetail.deleteTranslation'),
                        image: 'trash' as const,
                        imageColor: color.accent.delete,
                        titleColor: color.accent.delete,
                        attributes: { destructive: true },
                      },
                    ]
                  : []),
              ]}
            >
              <View>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={
                    onTranslate ? (
                      <Languages size={15} color={color.text.primary} strokeWidth={2} />
                    ) : (
                      <Trash2 size={15} color={color.accent.delete} strokeWidth={2} />
                    )
                  }
                  label={
                    isTranslating
                      ? t('recordingDetail.translating')
                      : onTranslate
                        ? t('recordingDetail.translate')
                        : t('recordingDetail.deleteTranslation')
                  }
                  color={color}
                  onPress={() => {}}
                  disabled={isAiProcessing || isTranslating}
                  accessibilityHint={
                    onTranslate
                      ? t('recordingDetail.translateMenuHint')
                      : t('recordingDetail.deleteTranslation')
                  }
                />
              </View>
            </MenuView>
          )}
        <Button
          variant="secondary"
          size="lg"
          icon={<Pencil size={15} color={color.text.primary} strokeWidth={2} />}
          label={hasAudio ? t('recordingDetail.editTranscript') : t('recordingDetail.editText')}
          color={color}
          onPress={onEditTranscript}
          disabled={isAiProcessing}
        />
        {hasAudio && (
          <Button
            variant="secondary"
            size="lg"
            icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
            label={t('recordingDetail.retranscribe')}
            color={color}
            onPress={onTranscribe}
            disabled={transcribeDisabled}
          />
        )}
      </ScrollView>
      <View className="px-4 pb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: transcriptExpanded }}
          accessibilityLabel={
            transcriptExpanded
              ? t('recordingDetail.transcriptCollapseA11y')
              : t('recordingDetail.transcriptExpandA11y')
          }
          accessibilityHint={t('recordingDetail.transcriptSectionA11y', { count: segments.length })}
          onPress={() => {
            hapticSelection();
            setTranscriptExpanded((v) => {
              if (!v) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
              return !v;
            });
          }}
          className="flex-row items-center justify-between gap-3 py-2 active:opacity-80"
        >
          <View className="min-w-0 flex-1 flex-row items-center gap-2" accessible={false}>
            <AlignLeft size={18} color={color.icon.muted} strokeWidth={2} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
                {hasAudio ? t('recordingDetail.transcript') : t('recordingDetail.text')}
              </Text>
              <Text className="text-xs" style={{ color: color.text.secondary }}>
                {t('recordingDetail.transcriptSegmentCount', { count: segments.length })}
              </Text>
            </View>
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
        {transcriptExpanded ? (
          <Animated.View
            entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
            className="pt-1"
          >
            {showTranslation ? (
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: color.background.secondary,
                  borderWidth: 1,
                  borderColor: color.border.default,
                }}
              >
                {translatedParagraphs.map((paragraph, idx) => (
                  <Text
                    key={`${idx}-${paragraph.slice(0, 18)}`}
                    className="text-[15px] leading-7"
                    style={{
                      color: color.text.primary,
                      marginBottom: idx === translatedParagraphs.length - 1 ? 0 : 14,
                    }}
                    selectable
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            ) : hasAudio ? (
              <TranscriptHighlight
                segments={segments}
                currentPositionMs={currentPositionMs}
                color={color}
              />
            ) : (
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: color.background.secondary,
                  borderWidth: 1,
                  borderColor: color.border.default,
                }}
              >
                {originalTextParagraphs.map((paragraph, idx) => (
                  <Text
                    key={`${idx}-${paragraph.slice(0, 18)}`}
                    className="text-[15px] leading-7"
                    style={{
                      color: color.text.primary,
                      marginBottom: idx === originalTextParagraphs.length - 1 ? 0 : 14,
                    }}
                    selectable
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
};
