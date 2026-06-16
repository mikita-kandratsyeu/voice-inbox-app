import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { isDarkSurfaceColor, useIsTablet, withAlphaHex } from '@/shared/lib';

import type { NoteDocumentPreambleParts } from '../lib/splitNoteDocumentPreamble';

type NoteDocumentReadingHeroProps = {
  color: Colors;
  parts: NoteDocumentPreambleParts;
};

export const NoteDocumentReadingHero = React.memo(function NoteDocumentReadingHero({
  color,
  parts,
}: NoteDocumentReadingHeroProps) {
  const isTablet = useIsTablet();
  const isDark = isDarkSurfaceColor(color);

  if (!parts.title && parts.metadataLines.length === 0) {
    return null;
  }

  const pillBackground = withAlphaHex(color.text.secondary, isDark ? 0.16 : 0.08);
  const pillTextColor = isDark ? color.text.primary : color.text.secondary;
  const titleFontSize = isTablet ? 32 : 28;
  const titleLineHeight = isTablet ? 38 : 34;

  return (
    <View style={{ gap: 12, marginBottom: 8 }}>
      {parts.title ? (
        <Text
          accessibilityRole="header"
          style={{
            color: color.text.primary,
            fontSize: titleFontSize,
            fontWeight: '700',
            letterSpacing: isTablet ? -0.8 : -0.6,
            lineHeight: titleLineHeight,
          }}
        >
          {parts.title}
        </Text>
      ) : null}

      {parts.metadataLines.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {parts.metadataLines.map((line) => (
            <View
              key={line}
              style={{
                backgroundColor: pillBackground,
                borderRadius: 999,
                paddingHorizontal: isTablet ? 13 : 12,
                paddingVertical: isTablet ? 7 : 6,
              }}
            >
              <Text
                style={{
                  color: pillTextColor,
                  fontSize: isTablet ? 14 : 13,
                  fontWeight: '500',
                  lineHeight: isTablet ? 19 : 18,
                }}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});
