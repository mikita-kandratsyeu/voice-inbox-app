import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import type { SummaryMetaLines } from '@/shared/lib/summaryMetaSubtitle';
import { hasSummaryMetaLines } from '@/shared/lib/summaryMetaSubtitle';

type SummaryMetaLinesTextProps = {
  lines: SummaryMetaLines;
  color: Colors;
};

export const SummaryMetaLinesText = ({ lines, color }: SummaryMetaLinesTextProps) => {
  if (!hasSummaryMetaLines(lines)) {
    return null;
  }

  const secondaryStyle = { color: color.text.secondary };

  return (
    <View className="gap-0.5">
      {lines.modelLine?.trim() ? (
        <Text className="text-[12px] leading-[18px]" style={secondaryStyle}>
          {lines.modelLine.trim()}
        </Text>
      ) : null}
      {lines.tokensLine?.trim() ? (
        <Text className="text-[12px] leading-[18px]" style={secondaryStyle}>
          {lines.tokensLine.trim()}
        </Text>
      ) : null}
      {lines.durationLine?.trim() ? (
        <Text className="text-[12px] leading-[18px]" style={secondaryStyle}>
          {lines.durationLine.trim()}
        </Text>
      ) : null}
    </View>
  );
};
