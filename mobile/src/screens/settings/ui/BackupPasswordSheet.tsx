import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BACKUP_PASSWORD_MIN_LENGTH, validateBackupPassword } from '@/features/sync-data';
import { useColors } from '@/shared/config';
import { IS_IOS, withAlphaHex } from '@/shared/lib';
import {
  APP_BOTTOM_SHEET_BACKDROP_SNAP,
  AppBottomSheetModal,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

export type BackupPasswordSheetMode = 'export' | 'import';

type Props = {
  visible: boolean;
  mode: BackupPasswordSheetMode;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

const textInputPadding = IS_IOS ? { paddingTop: 11, paddingBottom: 11 } : { paddingVertical: 12 };

export function BackupPasswordSheet({ visible, mode, busy = false, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(20);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExport = mode === 'export';
  const title = t(
    isExport ? 'settings.backupEncryption.exportTitle' : 'settings.backupEncryption.importTitle',
  );
  const subtitle = t(
    isExport
      ? 'settings.backupEncryption.exportSubtitle'
      : 'settings.backupEncryption.importSubtitle',
  );

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setConfirm('');
    setErrorMessage(null);
  }, [visible, mode]);

  const handleClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const handleSubmit = useCallback(() => {
    const validation = validateBackupPassword(password, isExport ? confirm : undefined);
    if (validation === 'too_short') {
      setErrorMessage(
        t('settings.backupEncryption.passwordTooShort', { min: BACKUP_PASSWORD_MIN_LENGTH }),
      );
      return;
    }
    if (validation === 'mismatch') {
      setErrorMessage(t('settings.backupEncryption.passwordMismatch'));
      return;
    }
    setErrorMessage(null);
    onSubmit(password.trim());
  }, [confirm, isExport, onSubmit, password, t]);

  const canSubmit =
    !busy &&
    password.trim().length >= BACKUP_PASSWORD_MIN_LENGTH &&
    (!isExport || confirm.trim().length >= BACKUP_PASSWORD_MIN_LENGTH);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        {...APP_BOTTOM_SHEET_BACKDROP_SNAP}
        pressBehavior={busy ? 'none' : 'close'}
        opacity={0.45}
      />
    ),
    [busy],
  );

  const primaryLabel = t(isExport ? 'settings.export' : 'settings.import');

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={handleClose}
      enablePanDownToClose={!busy}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: c.text.primary,
            textAlign: 'center',
            paddingTop: 4,
            marginBottom: 6,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: c.text.secondary,
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 4,
          }}
        >
          {subtitle}
        </Text>

        {isExport ? (
          <View
            className="mb-4 rounded-2xl border px-3.5 py-3"
            style={{
              backgroundColor: c.status.error.bg,
              borderColor: withAlphaHex(c.status.error.text, 0.22),
            }}
          >
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: c.status.error.text,
                textAlign: 'center',
              }}
            >
              {t('settings.backupEncryption.noticeWarning')}
            </Text>
          </View>
        ) : null}

        <Text className="mb-1.5 text-[13px] font-semibold" style={{ color: c.text.secondary }}>
          {t('settings.backupEncryption.passwordLabel')}
        </Text>
        <BottomSheetTextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) setErrorMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          placeholder={t('settings.backupEncryption.passwordPlaceholder', {
            min: BACKUP_PASSWORD_MIN_LENGTH,
          })}
          placeholderTextColor={c.text.muted}
          className="rounded-xl border px-3 text-[16px] leading-[22px]"
          style={{
            borderColor: c.border.default,
            color: c.text.primary,
            backgroundColor: c.background.secondary,
            ...textInputPadding,
          }}
          returnKeyType={isExport ? 'next' : 'done'}
          onSubmitEditing={isExport ? undefined : handleSubmit}
        />

        {isExport ? (
          <>
            <Text
              className="mb-1.5 mt-3 text-[13px] font-semibold"
              style={{ color: c.text.secondary }}
            >
              {t('settings.backupEncryption.confirmLabel')}
            </Text>
            <BottomSheetTextInput
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              placeholder={t('settings.backupEncryption.confirmPlaceholder', {
                min: BACKUP_PASSWORD_MIN_LENGTH,
              })}
              placeholderTextColor={c.text.muted}
              className="rounded-xl border px-3 text-[16px] leading-[22px]"
              style={{
                borderColor: c.border.default,
                color: c.text.primary,
                backgroundColor: c.background.secondary,
                ...textInputPadding,
              }}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </>
        ) : null}

        {errorMessage ? (
          <Text
            className="mt-2 px-1 text-center text-[14px] leading-5"
            style={{ color: c.accent.delete }}
          >
            {errorMessage}
          </Text>
        ) : null}

        <SheetFooterButtons
          className="mt-4 w-full"
          color={c}
          primaryLabel={primaryLabel}
          onPrimaryPress={handleSubmit}
          primaryDisabled={!canSubmit}
          primaryLoading={busy}
          primaryAccessibilityLabel={primaryLabel}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={handleClose}
          secondaryDisabled={busy}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
