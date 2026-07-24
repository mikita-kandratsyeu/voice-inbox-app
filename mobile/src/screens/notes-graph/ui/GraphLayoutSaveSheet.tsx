import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Text } from 'react-native';

import { useColors } from '@/shared/config';
import { hapticSuccess, IS_IOS } from '@/shared/lib';
import { AppBottomSheetContent, AppBottomSheetModal, SheetFooterButtons } from '@/shared/ui';

import { getNotesGraphLayoutAutoName } from '../lib/getNotesGraphLayoutAutoName';
import { resolveNotesGraphLayoutSaveName } from '../lib/resolveNotesGraphLayoutSaveName';

const SAVE_SHEET_KEYBOARD_BOTTOM_PADDING = 12;

type GraphLayoutSaveSheetProps = {
  visible: boolean;
  movedNodeCount: number;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (name: string) => void | Promise<void>;
};

export function GraphLayoutSaveSheet({
  visible,
  movedNodeCount,
  isSaving = false,
  onCancel,
  onSave,
}: GraphLayoutSaveSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const skipNextDismissRef = useRef(false);
  const autoTitleRef = useRef('');
  const [title, setTitle] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    skipNextDismissRef.current = false;
    autoTitleRef.current = getNotesGraphLayoutAutoName();
    setTitle('');
  }, [visible]);

  useEffect(() => {
    const showEvent = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (skipNextDismissRef.current) {
      skipNextDismissRef.current = false;
      return;
    }
    if (!isSaving) {
      onCancel();
    }
  }, [isSaving, onCancel]);

  const handleCancel = useCallback(() => {
    if (isSaving) return;
    skipNextDismissRef.current = true;
    onCancel();
    bottomSheetRef.current?.dismiss();
  }, [isSaving, onCancel]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const resolvedName = resolveNotesGraphLayoutSaveName(title || autoTitleRef.current);
    await onSave(resolvedName);
    hapticSuccess();
    skipNextDismissRef.current = true;
    bottomSheetRef.current?.dismiss();
  }, [isSaving, onSave, title]);

  return (
    <AppBottomSheetModal
      ref={bottomSheetRef}
      visible={visible}
      onClose={handleDismiss}
      surface="card"
      enablePanDownToClose={!isSaving}
      backdrop="subtle"
      backdropPressBehavior={isSaving ? 'none' : 'close'}
      handleIndicatorStyle={{ backgroundColor: color.text.muted }}
    >
      <AppBottomSheetContent
        useTabletPadding
        style={{
          paddingTop: 4,
          ...(keyboardVisible ? { paddingBottom: SAVE_SHEET_KEYBOARD_BOTTOM_PADDING } : {}),
          gap: 12,
        }}
      >
        <Text className="text-lg font-bold" style={{ color: color.text.primary }}>
          {t('notesGraph.saveLayoutSheet.title')}
        </Text>

        <BottomSheetTextInput
          className="rounded-xl border-2 px-4 py-3 text-[16px]"
          style={{
            borderColor: color.accent.primary,
            color: color.text.primary,
            backgroundColor: color.background.tertiary,
          }}
          placeholder={t('notesGraph.saveLayoutSheet.namePlaceholder')}
          placeholderTextColor={color.text.muted}
          value={title}
          onChangeText={setTitle}
          autoFocus
          editable={!isSaving}
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSave();
          }}
          accessibilityLabel={t('notesGraph.saveLayoutSheet.namePlaceholder')}
          accessibilityHint={t('notesGraph.saveLayoutSheet.nameInputHint')}
        />

        <Text className="-mt-1 text-[13px]" style={{ color: color.text.secondary }}>
          {t('notesGraph.saveLayoutSheet.movedNodes', { count: movedNodeCount })}
        </Text>

        <SheetFooterButtons
          className="mt-1 w-full"
          color={color}
          primaryLabel={t('common.save')}
          onPrimaryPress={handleSave}
          primaryLoading={isSaving}
          primaryDisabled={isSaving}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={handleCancel}
          secondaryDisabled={isSaving}
          secondaryAccessibilityLabel={t('common.cancel')}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
