import { Cloud, FileText } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { TabEmptyState } from '@/shared/ui';

type SummaryTabProps = {
  summary: string;
  color: Colors;
  onGenerate: () => void;
};

export const SummaryTab = ({ summary, color, onGenerate }: SummaryTabProps) => {
  if (!summary) {
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Конспект не создан"
        description={'Нажмите кнопку ниже, чтобы\nсоздать краткий конспект с помощью Gemini.'}
        buttonLabel="Создать конспект"
        buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
        hint="Gemini · Требует подключения к интернету"
        hintIcon={
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} className="mt-0.5" />
        }
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
