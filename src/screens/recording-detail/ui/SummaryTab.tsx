import { Cloud, FileText, WifiOff } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { AI_MODELS, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';
import { TabEmptyState } from '@/shared/ui';

type SummaryTabProps = {
  summary: string;
  color: Colors;
  onGenerate: () => void;
};

export const SummaryTab = ({ summary, color, onGenerate }: SummaryTabProps) => {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const { isConnected } = useNetworkStatus();

  if (!summary) {
    const hint =
      isConnected === false ? `${aiModelName} · Нет подключения к интернету` : aiModelName;

    const hintIcon =
      isConnected === false ? (
        <WifiOff size={14} color={color.accent.delete} strokeWidth={1.8} />
      ) : (
        <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} />
      );

    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Конспект не создан"
        description={'Нажмите кнопку ниже, чтобы\nсоздать краткий конспект с помощью ИИ.'}
        buttonLabel="Создать конспект"
        buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
        hint={hint}
        hintIcon={hintIcon}
        disabled={isConnected === false}
        onPress={onGenerate}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {summary}
      </Text>
    </View>
  );
};
