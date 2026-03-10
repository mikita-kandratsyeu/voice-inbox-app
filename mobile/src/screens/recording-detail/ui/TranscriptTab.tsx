import { Mic, RefreshCw } from 'lucide-react-native';
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
};

export const TranscriptTab = ({ segments, color, hasAudio, onTranscribe }: TranscriptTabProps) => {
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
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {segments.map((seg) => (
        <View key={seg.id} className="flex-row gap-2.5">
          <Text
            className="mt-0.5 min-w-9 text-xs font-semibold"
            style={{ color: color.accent.primary }}
          >
            {seg.startTime}
          </Text>
          <Text className="flex-1 text-sm leading-[22px]" style={{ color: color.text.primary }}>
            {seg.text}
          </Text>
        </View>
      ))}
      {hasAudio && (
        <Button
          variant="secondary"
          size="lg"
          icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
          label={t('recordingDetail.retranscribe')}
          color={color}
          onPress={onTranscribe}
          className="mt-1"
        />
      )}
    </View>
  );
};
