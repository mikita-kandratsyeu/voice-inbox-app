import { Mic, Pencil, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { Button, TabEmptyState } from '@/shared/ui';

type TranscriptTabProps = {
  segments: TranscriptSegment[];
  color: Colors;
  hasAudio: boolean;
  onTranscribe: () => void;
  onEditTranscript: () => void;
  isAiProcessing?: boolean;
};

export const TranscriptTab = ({
  segments,
  color,
  hasAudio,
  onTranscribe,
  onEditTranscript,
  isAiProcessing = false,
}: TranscriptTabProps) => {
  const { t } = useTranslation();
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelName =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;

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
        color={color}
        hideButton={!hasAudio}
        disabled={isAiProcessing}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {segments.map((seg) => (
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
      ))}
      <View className="mt-2 flex-row flex-wrap gap-2">
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
