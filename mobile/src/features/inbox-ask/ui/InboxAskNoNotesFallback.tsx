import { Sparkle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ErrorState } from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';
import { hapticSelection, withAlphaHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

type InboxAskNoNotesFallbackProps = {
  color: Colors;
  errorMessage: string | null;
  canAskWithoutNotes: boolean;
  generalAskAvailable: boolean;
  onRetry: () => void;
  onAskWithoutNotes: () => void;
  showPrivateModeCta?: boolean;
  errorTitleKey?: string;
  errorRetryLabelKey?: string;
  errorFallbackHintKey?: string;
};

export function InboxAskNoNotesFallback({
  color,
  errorMessage,
  canAskWithoutNotes,
  generalAskAvailable,
  onRetry,
  onAskWithoutNotes,
  showPrivateModeCta = false,
  errorTitleKey,
  errorRetryLabelKey,
  errorFallbackHintKey,
}: InboxAskNoNotesFallbackProps) {
  const { t } = useTranslation();
  const hint = generalAskAvailable
    ? t('inboxAsk.askWithoutNotesHint')
    : t('inboxAsk.generalAskUnavailable');

  const cardStyle = {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlphaHex(color.border.default, 0.9),
    backgroundColor: color.background.secondary,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 12,
  } as const;

  return (
    <View className="gap-3">
      <ErrorState
        color={color}
        errorMessage={errorMessage}
        onRetry={onRetry}
        showPrivateModeCta={showPrivateModeCta}
        titleKey={errorTitleKey}
        retryLabelKey={errorRetryLabelKey}
        fallbackHintKey={errorFallbackHintKey}
      />
      {canAskWithoutNotes ? (
        <View style={{ maxWidth: 440, width: '100%', alignSelf: 'center' }}>
          <View style={cardStyle}>
            <View className="flex-row items-start gap-3">
              <View className="h-9 w-9 shrink-0 items-center justify-center">
                <Sparkle size={22} color={color.accent.primary} strokeWidth={2} />
              </View>
              <View className="min-w-0 flex-1 gap-1.5">
                <Text
                  className="text-[17px] font-semibold leading-6"
                  style={{ color: color.text.primary }}
                >
                  {t('inboxAsk.askWithoutNotesCta')}
                </Text>
                <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
                  {hint}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: color.border.default, opacity: 0.85 }} />

            <Button
              variant="secondary"
              size="md"
              fullWidth
              label={t('common.continue')}
              color={color}
              onPress={() => {
                hapticSelection();
                onAskWithoutNotes();
              }}
              disabled={!generalAskAvailable}
              accessibilityLabel={t('inboxAsk.askWithoutNotesCta')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
