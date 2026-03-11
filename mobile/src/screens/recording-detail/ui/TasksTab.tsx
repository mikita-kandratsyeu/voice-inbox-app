import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Cloud,
  ListChecks,
  Loader,
  RefreshCw,
  WifiOff,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { RecordingStatus, TaskItem } from '@/entities/record';
import { AI_MODELS, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';
import { Button, TabEmptyState } from '@/shared/ui';

type TasksTabProps = {
  tasks: TaskItem[];
  status: RecordingStatus;
  hasTranscript?: boolean;
  color: Colors;
  onToggle: (id: string) => void;
  onExtract: () => void;
};

export const TasksTab = ({
  tasks,
  status,
  hasTranscript = true,
  color,
  onToggle,
  onExtract,
}: TasksTabProps) => {
  const { t } = useTranslation();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const { isConnected } = useNetworkStatus();

  if (status === 'processing') {
    return (
      <View className="items-center gap-3 p-8">
        <ActivityIndicator color={color.accent.primary} />
        <Text className="text-sm" style={{ color: color.text.secondary }}>
          {t('recordingDetail.tasksProcessing')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <TabEmptyState
        icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
        title={t('recordingDetail.tasksError')}
        description=""
        buttonLabel={t('recordingDetail.tasksRetry')}
        buttonIcon={<Loader size={18} color="#fff" strokeWidth={2} />}
        onPress={onExtract}
        color={color}
      />
    );
  }

  if (!hasTranscript) {
    return (
      <TabEmptyState
        icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.noTranscriptForAi')}
        description={t('recordingDetail.noTranscriptForAiDesc')}
        color={color}
      />
    );
  }

  if (tasks.length === 0) {
    const hintIcon =
      isConnected === false ? (
        <WifiOff size={14} color={color.accent.delete} strokeWidth={1.8} />
      ) : (
        <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} />
      );

    return (
      <TabEmptyState
        icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.tasksNotExtracted')}
        description={t('recordingDetail.tasksNotExtractedDesc')}
        buttonLabel={t('recordingDetail.extractTasks')}
        buttonIcon={<ListChecks size={18} color="#fff" strokeWidth={2} />}
        hint={aiModelName}
        hintIcon={hintIcon}
        disabled={isConnected === false}
        onPress={onExtract}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          className="flex-row items-center gap-3 py-1"
          onPress={() => onToggle(task.id)}
          android_ripple={{ color: color.background.tertiary }}
        >
          {task.isDone ? (
            <CheckCircle2 size={20} color={color.accent.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={color.icon.muted} strokeWidth={2} />
          )}
          <Text
            className="flex-1 text-sm leading-5"
            style={{
              color: task.isDone ? color.text.secondary : color.text.primary,
              textDecorationLine: task.isDone ? 'line-through' : undefined,
            }}
          >
            {task.text}
          </Text>
        </Pressable>
      ))}
      <Button
        variant="secondary"
        size="lg"
        icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
        label={t('recordingDetail.reextractTasks')}
        color={color}
        onPress={onExtract}
        disabled={isConnected === false}
        className="mt-1"
      />
    </View>
  );
};
