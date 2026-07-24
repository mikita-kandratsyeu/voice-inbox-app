import Clipboard from '@react-native-clipboard/clipboard';
import { Check, Copy } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

type NoteDocumentCodeBlockProps = {
  code: string;
  language?: string;
  color: Colors;
  enableSyntaxHighlighting?: boolean;
};

const COPY_SUCCESS_DURATION = 2000;

export const NoteDocumentCodeBlock = React.memo(function NoteDocumentCodeBlock({
  code,
  language,
  color,
  enableSyntaxHighlighting = true,
}: NoteDocumentCodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    Clipboard.setString(code);
    hapticLight();
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, COPY_SUCCESS_DURATION);
  }, [code]);

  return (
    <View
      style={{
        position: 'relative',
        borderRadius: 12,
        backgroundColor: color.background.secondary,
        borderWidth: 1,
        borderColor: color.border.default,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header with language and copy button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          backgroundColor: color.background.tertiary,
        }}
      >
        {language ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: color.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {language}
          </Text>
        ) : (
          <View />
        )}

        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('common.copied') : t('common.copy')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: pressed ? color.background.secondary : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {copied ? (
            <>
              <Check size={14} color={color.accent.primary} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: color.accent.primary,
                }}
              >
                {t('common.copied')}
              </Text>
            </>
          ) : (
            <>
              <Copy size={14} color={color.text.secondary} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: color.text.secondary,
                }}
              >
                {t('common.copy')}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Code content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 400 }}
        contentContainerStyle={{ padding: 16 }}
      >
        {enableSyntaxHighlighting ? (
          <SyntaxHighlightedCode code={code} language={language} color={color} />
        ) : (
          <Text
            style={{
              fontFamily: 'Menlo',
              fontSize: 14,
              lineHeight: 22,
              color: color.text.primary,
            }}
          >
            {code}
          </Text>
        )}
      </ScrollView>
    </View>
  );
});
