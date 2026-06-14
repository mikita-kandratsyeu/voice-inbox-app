import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  type LinkedNoteContext,
  LinkedNoteContextBanner,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { TaskFollowUpActions } from './TaskFollowUpActions';

const OUTCOME_TEXT_MAX_CHARS = 2000;

type TaskOutcomeSheetProps = {
  visible: boolean;
  task: TaskItem | null;
  linkedNoteContext?: LinkedNoteContext;
  onClose: () => void;
  onComplete: (outcomeText?: string | null) => void;
  onSkip: () => void;
  onVoiceFollowUp: (outcomeText?: string | null) => void;
  onTextFollowUp: (outcomeText?: string | null) => void;
};

export function TaskOutcomeSheet({
  visible,
  task,
  linkedNoteContext,
  onClose,
  onComplete,
  onSkip,
  onVoiceFollowUp,
  onTextFollowUp,
}: TaskOutcomeSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) {
      setDraft('');
    }
  }, [visible]);

  const normalizedDraft = draft.split('\0').join('').trim();
  const outcomeText = normalizedDraft.length > 0 ? normalizedDraft : null;

  const handleComplete = useCallback(() => {
    onComplete(outcomeText);
    bottomSheetRef.current?.dismiss();
  }, [onComplete, outcomeText]);

  const handleSkip = useCallback(() => {
    onSkip();
    bottomSheetRef.current?.dismiss();
  }, [onSkip]);

  const handleVoiceFollowUp = useCallback(() => {
    onVoiceFollowUp(outcomeText);
    bottomSheetRef.current?.dismiss();
  }, [onVoiceFollowUp, outcomeText]);

  const handleTextFollowUp = useCallback(() => {
    onTextFollowUp(outcomeText);
    bottomSheetRef.current?.dismiss();
  }, [onTextFollowUp, outcomeText]);

  return (
    <AppBottomSheetModal ref={bottomSheetRef} visible={visible} onClose={onClose}>
      <AppBottomSheetContent
        scrollable
        useTabletPadding
        bottomPadding={24}
        style={{ width: '100%' }}
      >
        <SheetHeader
          title={t('taskOutcome.sheetTitle')}
          color={color}
          marginBottom={linkedNoteContext ? 12 : 16}
        />
        {linkedNoteContext ? (
          <LinkedNoteContextBanner context={linkedNoteContext} color={color} />
        ) : null}
        {task ? (
          <Text
            className="mb-3 text-[15px] leading-5"
            style={{ color: color.text.primary }}
            numberOfLines={4}
          >
            {task.text}
          </Text>
        ) : null}
        <Text
          className="mb-2 text-[12px] font-semibold uppercase tracking-[0.8px]"
          style={{ color: color.text.secondary }}
        >
          {t('taskOutcome.outcomeLabel')}
        </Text>
        <BottomSheetTextInput
          value={draft}
          onChangeText={(text) =>
            setDraft(text.split('\0').join('').slice(0, OUTCOME_TEXT_MAX_CHARS))
          }
          multiline
          textAlignVertical="top"
          placeholder={t('taskOutcome.outcomePlaceholder')}
          placeholderTextColor={color.text.muted}
          accessibilityLabel={t('taskOutcome.outcomeLabel')}
          className="min-h-[120px] rounded-xl px-3.5 py-3 text-[16px] leading-[22px]"
          style={{
            color: color.text.primary,
            backgroundColor: color.background.tertiary,
          }}
        />
        <Text className="mt-2 text-center text-[12px]" style={{ color: color.text.secondary }}>
          {t('taskOutcome.optionalHint')}
        </Text>
        <TaskFollowUpActions
          color={color}
          onVoiceFollowUp={handleVoiceFollowUp}
          onTextFollowUp={handleTextFollowUp}
        />
        <View className="mt-2">
          <SheetFooterButtons
            color={color}
            primaryLabel={t('taskOutcome.saveDone')}
            onPrimaryPress={handleComplete}
            secondaryLabel={t('taskOutcome.skip')}
            onSecondaryPress={handleSkip}
          />
        </View>
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
