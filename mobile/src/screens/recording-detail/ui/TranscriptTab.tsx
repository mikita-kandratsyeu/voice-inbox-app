import { Check, Mic, Pencil, RefreshCw, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { useEditTranscript } from '@/features/edit-transcript';
import type { Colors } from '@/shared/config';
import { getInputFieldInputStyle } from '@/shared/ui';
import { Button, TabEmptyState } from '@/shared/ui';

type TranscriptTabProps = {
  recordId: string;
  segments: TranscriptSegment[];
  color: Colors;
  hasAudio: boolean;
  onTranscribe: () => void;
  isAiProcessing?: boolean;
};

export const TranscriptTab = ({
  recordId,
  segments,
  color,
  hasAudio,
  onTranscribe,
  isAiProcessing = false,
}: TranscriptTabProps) => {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelName =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;

  const { editedSegments, updateSegmentText, save, reset, hasChanges, isSaving } =
    useEditTranscript({
      recordId,
      segments,
      onSaved: () => setIsEditMode(false),
    });

  const handleCancelEdit = useCallback(() => {
    reset();
    setIsEditMode(false);
  }, [reset]);

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

  if (isEditMode) {
    return (
      <View className="gap-3.5 p-4">
        {editedSegments.map((seg) => (
          <View key={seg.id} className="flex-row gap-2.5">
            <Text
              className="mt-2 min-w-9 text-xs font-semibold"
              style={{ color: color.accent.primary }}
            >
              {seg.startTime}
            </Text>
            <TextInput
              className="flex-1 text-sm leading-[22px]"
              style={[
                getInputFieldInputStyle(color, true),
                { color: color.text.primary, minHeight: 44 },
              ]}
              placeholderTextColor={color.text.secondary}
              value={seg.text}
              onChangeText={(text) => updateSegmentText(seg.id, text)}
              multiline
              editable={!isSaving}
            />
          </View>
        ))}
        <View className="mt-2 flex-row gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<X size={16} color={color.text.primary} strokeWidth={2} />}
            label={t('common.cancel')}
            color={color}
            onPress={handleCancelEdit}
            disabled={isSaving}
            className="flex-1"
          />
          <Button
            variant="primary"
            size="md"
            icon={<Check size={16} color="#fff" strokeWidth={2.5} />}
            label={t('common.save')}
            color={color}
            onPress={save}
            disabled={isSaving || !hasChanges()}
            className="flex-1"
          />
        </View>
      </View>
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
      <View className="mt-1 flex-row flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          icon={<Pencil size={15} color={color.text.primary} strokeWidth={2} />}
          label={t('recordingDetail.editTranscript')}
          color={color}
          onPress={() => setIsEditMode(true)}
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
