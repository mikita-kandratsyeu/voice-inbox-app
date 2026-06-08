import { Cpu } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

type RecordOfflineStatusCardProps = {
  title: string;
  subtitle: string;
  hidden?: boolean;
};

export const RecordOfflineStatusCard = ({
  title,
  subtitle,
  hidden = false,
}: RecordOfflineStatusCardProps) => {
  return (
    <View
      className="w-full max-w-[420px] flex-row items-center gap-3.5 rounded-2xl px-4 py-3.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        opacity: hidden ? 0 : 1,
      }}
    >
      <View
        className="h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
      >
        <Cpu size={20} color="#ffffff" strokeWidth={1.85} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold leading-5 text-white">{title}</Text>
        <Text
          className="mt-1 text-[13px] leading-[18px]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
};
