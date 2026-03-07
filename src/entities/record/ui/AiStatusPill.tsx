import { AlertCircle, CheckCircle2, Loader, MicOff } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { RecordingStatus } from '../model/types';

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  onPress: () => void;
};

export const AiStatusPill = ({ aiStatus, onPress }: AiStatusPillProps) => {
  if (aiStatus === 'done') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <CheckCircle2 size={20} color="#22c55e" strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'processing') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 dark:bg-blue-950"
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Loader size={11} color="#3b82f6" strokeWidth={2.5} />
        <Text className="text-xs font-medium text-blue-500 dark:text-blue-400">
          Транскрибируется...
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 dark:bg-red-950"
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color="#ef4444" strokeWidth={2.5} />
        <Text className="text-xs font-medium text-red-500 dark:text-red-400">Ошибка</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
      <MicOff size={11} color="#9ca3af" strokeWidth={2.5} />
      <Text className="text-xs font-medium text-gray-400 dark:text-gray-500">Нет транскрипта</Text>
    </View>
  );
};
