import { AlertCircle, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/shared/ui';

type TranscriptErrorProps = {
  onRetry: () => void;
};

export const TranscriptError = ({ onRetry }: TranscriptErrorProps) => (
  <View className="m-4 overflow-hidden rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
    <View className="flex-row items-start gap-3 p-4">
      <View className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900">
        <AlertCircle size={18} color="#ef4444" strokeWidth={2} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-red-700 dark:text-red-400">
          Не удалось транскрибировать
        </Text>
        <Text className="text-xs leading-5 text-red-500 dark:text-red-500">
          Произошла ошибка при обработке аудио. Проверьте, что запись не повреждена, и попробуйте
          ещё раз.
        </Text>
      </View>
    </View>
    <View className="border-t border-red-200 dark:border-red-900">
      <Button
        variant="danger"
        icon={<RefreshCw size={14} color="#ef4444" strokeWidth={2.5} />}
        label="Попробовать снова"
        onPress={onRetry}
        activeOpacity={0.7}
        containerStyle={{ paddingVertical: 12 }}
      />
    </View>
  </View>
);
