import React, { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Colors } from '@/shared/config';
import { PrivateExecutionBadge } from '@/shared/ui';

type InboxHeaderProps = {
  color: Colors;
  isLoaded: boolean;
  isPrivateMode?: boolean;
  rightSlot?: React.ReactNode;
  subtitleText: string;
  title: string;
};

export const InboxHeader = memo(function InboxHeader({
  color,
  isLoaded,
  isPrivateMode = false,
  rightSlot,
  subtitleText,
  title,
}: InboxHeaderProps) {
  const insets = useSafeAreaInsets();

  const headerStyle = useMemo(
    () => ({
      backgroundColor: color.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: color.border.default,
      paddingTop: insets.top + 16,
    }),
    [color.background.primary, color.border.default, insets.top],
  );

  const titleStyle = useMemo(() => ({ color: color.text.primary }), [color.text.primary]);

  const subtitleStyle = useMemo(() => ({ color: color.text.secondary }), [color.text.secondary]);

  return (
    <View className="px-4 pb-3" style={headerStyle}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold" style={titleStyle}>
              {title}
            </Text>
            {isPrivateMode ? <PrivateExecutionBadge color={color} compact /> : null}
          </View>
          {isLoaded ? (
            <Text className="mt-1 text-sm" style={subtitleStyle}>
              {subtitleText}
            </Text>
          ) : (
            <View
              className="mt-2 h-3 w-20 rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            />
          )}
        </View>
        {rightSlot !== undefined ? <View className="pt-0.5">{rightSlot}</View> : null}
      </View>
    </View>
  );
});
