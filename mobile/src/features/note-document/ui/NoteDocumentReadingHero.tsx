import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import type { NoteDocumentPreambleParts } from '../lib/splitNoteDocumentPreamble';

type NoteDocumentReadingHeroProps = {
  color: Colors;
  parts: NoteDocumentPreambleParts;
};

export const NoteDocumentReadingHero = React.memo(function NoteDocumentReadingHero({
  color,
  parts,
}: NoteDocumentReadingHeroProps) {
  if (!parts.title && parts.metadataLines.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12, marginBottom: 8 }}>
      {parts.title ? (
        <Text
          accessibilityRole="header"
          style={{
            color: color.text.primary,
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.6,
            lineHeight: 34,
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
                backgroundColor: withAlphaHex(color.text.secondary, 0.08),
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  color: color.text.secondary,
                  fontSize: 13,
                  fontWeight: '500',
                  lineHeight: 18,
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
