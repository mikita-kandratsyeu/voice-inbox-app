import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { tokenizeCode } from '../lib/syntaxHighlighting';

type SyntaxHighlightedCodeProps = {
  code: string;
  language?: string;
  color: Colors;
  fontSize?: number;
  lineHeight?: number;
};

export const SyntaxHighlightedCode = React.memo(function SyntaxHighlightedCode({
  code,
  language = 'plain',
  color,
  fontSize = 14,
  lineHeight = 22,
}: SyntaxHighlightedCodeProps) {
  const tokens = useMemo(() => tokenizeCode(code, language, color), [code, language, color]);

  // Split tokens into lines for better rendering
  const lines = useMemo(() => {
    const result: (typeof tokens)[][] = [];
    let currentLine: typeof tokens = [];

    for (const token of tokens) {
      const parts = token.content.split('\n');

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part) {
          currentLine.push({
            ...token,
            content: part,
          });
        }

        // New line (except for the last part)
        if (i < parts.length - 1) {
          result.push(currentLine);
          currentLine = [];
        }
      }
    }

    // Push remaining line
    if (currentLine.length > 0) {
      result.push(currentLine);
    }

    return result;
  }, [tokens]);

  return (
    <View>
      {lines.map((lineTokens, lineIndex) => (
        <View key={lineIndex} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {lineTokens.map((token, tokenIndex) => (
            <Text
              key={tokenIndex}
              style={{
                fontFamily: 'Menlo',
                fontSize,
                lineHeight,
                color: token.color,
              }}
            >
              {token.content}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
});
