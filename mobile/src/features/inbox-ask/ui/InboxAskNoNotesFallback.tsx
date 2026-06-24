import { Sparkle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ErrorState } from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
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
  const askWithoutNotesButton = canAskWithoutNotes ? (
    <Button
      variant="secondary"
      size="md"
      label={t('inboxAsk.askWithoutNotesCtaShort')}
      icon={<Sparkle size={16} color={color.accent.primary} strokeWidth={2} />}
      color={color}
      onPress={() => {
        hapticSelection();
        onAskWithoutNotes();
      }}
      disabled={!generalAskAvailable}
      containerStyle={{ flex: 1, minWidth: 0 }}
      accessibilityLabel={t('inboxAsk.askWithoutNotesCta')}
    />
  ) : null;

  return (
    <View className="gap-2">
      <ErrorState
        color={color}
        errorMessage={errorMessage}
        onRetry={onRetry}
        showPrivateModeCta={showPrivateModeCta}
        titleKey={errorTitleKey}
        retryLabelKey={errorRetryLabelKey}
        fallbackHintKey={errorFallbackHintKey}
        actionSlot={askWithoutNotesButton}
      />
      {canAskWithoutNotes ? (
        <View
          className="items-center"
          style={{ maxWidth: 440, width: '100%', alignSelf: 'center' }}
        >
          <Text
            className="px-4 text-center text-[13px] leading-[18px]"
            style={{ color: color.text.secondary }}
          >
            {hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
