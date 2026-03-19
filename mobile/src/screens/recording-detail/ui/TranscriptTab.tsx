import { MenuView } from '@react-native-menu/menu';
import { Eye, Languages, Mic, Pencil, RefreshCw, Undo2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { getColors, useAppTheme } from '@/shared/config';
import { Button, TabEmptyState } from '@/shared/ui';

import { TRANSLATE_LANGUAGES } from '../config/transcriptionLanguageConfig';

type TranscriptTabProps = {
  segments: TranscriptSegment[];
  translatedTranscript?: string;
  translationLanguage?: string;
  color: Colors;
  hasAudio: boolean;
  onTranscribe: () => void;
  onEditTranscript: () => void;
  onTranslate?: (targetLanguage: string) => Promise<boolean>;
  isTranslating?: boolean;
  isAiProcessing?: boolean;
};

export const TranscriptTab = ({
  segments,
  translatedTranscript,
  translationLanguage,
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
  const themeColors = getColors(theme);
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelName =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;

  const hasTranslation = Boolean(translatedTranscript?.trim());
  const showTranslation = hasTranslation && viewMode === 'translated';

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
    <View className="gap-3.5 p-4">
      {showTranslation ? (
        <Text className="text-sm leading-[22px]" style={{ color: color.text.primary }}>
          {translatedTranscript}
        </Text>
      ) : (
        segments.map((seg) => (
          <View key={seg.id} className="flex-row items-start gap-3">
            <Text
              className="w-12 shrink-0 pt-0.5 text-xs font-semibold tabular-nums"
              style={{ color: color.accent.primary }}
            >
              {seg.startTime}
            </Text>
            <Text className="flex-1 text-sm leading-[22px]" style={{ color: color.text.primary }}>
              {seg.text}
            </Text>
          </View>
        ))
      )}
      <View className="mt-2 flex-row flex-wrap gap-2">
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
              titleColor: themeColors.text.primary,
            }))}
          >
            <View>
              <Button
                variant="secondary"
                size="md"
                icon={<Languages size={15} color={color.text.primary} strokeWidth={2} />}
                label={
                  isTranslating ? t('recordingDetail.translating') : t('recordingDetail.translate')
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
  );
};
