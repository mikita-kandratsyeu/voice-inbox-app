import { Bookmark, Cpu } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { FrostedChromeSurface } from '@/shared/ui';

const CARD_RADIUS = 16;
const MARKS_PILL_RADIUS = 9999;

type RecordOfflineStatusCardProps = {
  title: string;
  subtitle: string;
  marksHint?: string | null;
  hidden?: boolean;
};

export const RecordOfflineStatusCard = ({
  title,
  subtitle,
  marksHint = null,
  hidden = false,
}: RecordOfflineStatusCardProps) => {
  const color = useColors();

  return (
    <View className="relative w-full max-w-[420px]" style={{ opacity: hidden ? 0 : 1 }}>
      <FrostedChromeSurface
        color={color}
        borderRadius={CARD_RADIUS}
        shadow="subtle"
        variant="onMedia"
        style={{ width: '100%' }}
      >
        <View className="w-full flex-row items-center gap-3.5 px-4 py-3.5">
          <View
            className="h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
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
      </FrostedChromeSurface>
      {marksHint ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center"
          style={{ top: '100%', marginTop: 8 }}
        >
          <FrostedChromeSurface
            color={color}
            borderRadius={MARKS_PILL_RADIUS}
            shadow="subtle"
            variant="onMedia"
          >
            <View className="flex-row items-center gap-1.5 px-2.5 py-1" style={{ minHeight: 28 }}>
              <Bookmark size={13} color="#ffffff" strokeWidth={2} fill="rgba(255,255,255,0.22)" />
              <Text className="text-[12px] font-semibold leading-4 text-white/90">{marksHint}</Text>
            </View>
          </FrostedChromeSurface>
        </View>
      ) : null}
    </View>
  );
};
