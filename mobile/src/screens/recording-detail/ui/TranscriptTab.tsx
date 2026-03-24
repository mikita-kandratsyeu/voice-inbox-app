import { MenuView } from '@react-native-menu/menu';
import { Eye, Languages, Mic, Pencil, RefreshCw, Undo2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import { TRANSLATE_LANGUAGES, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { TranscriptHighlight } from '@/features/transcript-highlight';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { Button, TabEmptyState } from '@/shared/ui';

type TranscriptTabProps = {
  segments: TranscriptSegment[];
  translatedTranscript?: string;
  translationLanguage?: string;
  currentPositionMs?: number;
  color: Colors;
  hasAudio: boolean;
  onTranscribe: () => void;
  onEditTranscript: () => void;
  onTranslate?: (targetLanguage: string) => Promise<boolean>;
  isTranslating?: boolean;
  isAiProcessing?: boolean;
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
  segments,
  translatedTranscript,
  translationLanguage,
  currentPositionMs = 0,
  color,
  hasAudio,
  onTranscribe,
  onEditTranscript,
  onTranslate,
  isTranslating = false,
  isAiProcessing = false,
}: TranscriptTabProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelName =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;

  const hasTranslation = Boolean(translatedTranscript?.trim());
  const showTranslation = hasTranslation && viewMode === 'translated';
  const translatedParagraphs = buildReadableParagraphs(translatedTranscript ?? '');

  if (segments.length === 0) {
    return (
      <TabEmptyState
        icon={<Mic size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.transcriptNotCreated')}
        description={t('recordingDetail.transcriptNotCreatedDesc')}
        buttonLabel={t('recordingDetail.transcribe')}
        buttonIcon={<Mic size={18} color="#fff" strokeWidth={2} />}
        hint={`Whisper ${whisperModelName}`}
        onPress={onTranscribe}
        hideButton={!hasAudio}
        disabled={isAiProcessing}
      />
    );
  }

  return (
    <View>
      <View className="pt-3">
        <View className="flex-row flex-wrap gap-2 px-4 pb-4">
          {hasTranslation && (
            <Button
              variant="secondary"
              size="md"
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
          {onTranslate && segments.length > 0 && (
            <MenuView
              key={theme}
              themeVariant={isDark ? 'dark' : 'light'}
              onPressAction={async ({ nativeEvent }) => {
                const lang = nativeEvent.event;
                if ((TRANSLATE_LANGUAGES as readonly string[]).includes(lang)) {
                  const ok = await onTranslate(lang);

                  if (ok) {
                    setViewMode('translated');
                  }
                }
              }}
              actions={TRANSLATE_LANGUAGES.map((lang) => ({
                id: lang,
                title: t(`recordingDetail.language.${lang}`),
                titleColor: color.text.primary,
              }))}
            >
              <View>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Languages size={15} color={color.text.primary} strokeWidth={2} />}
                  label={
                    isTranslating
                      ? t('recordingDetail.translating')
                      : t('recordingDetail.translate')
                  }
                  color={color}
                  onPress={() => {}}
                  disabled={isAiProcessing || isTranslating}
                />
              </View>
            </MenuView>
          )}
          <Button
            variant="secondary"
            size="md"
            icon={<Pencil size={15} color={color.text.primary} strokeWidth={2} />}
            label={t('recordingDetail.editTranscript')}
            color={color}
            onPress={onEditTranscript}
            disabled={isAiProcessing}
          />
          {hasAudio && (
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
              label={t('recordingDetail.retranscribe')}
              color={color}
              onPress={onTranscribe}
              disabled={isAiProcessing}
            />
          )}
        </View>
      </View>
      {showTranslation ? (
        <View className="px-4 pb-4">
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
        </View>
      ) : (
        <TranscriptHighlight
          segments={segments}
          currentPositionMs={currentPositionMs}
          color={color}
        />
      )}
    </View>
  );
};
