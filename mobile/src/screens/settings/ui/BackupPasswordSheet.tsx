import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { BACKUP_PASSWORD_MIN_LENGTH, validateBackupPassword } from '@/features/sync-data';
import { type Colors, useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { BackupEncryptionWarningBanner } from './BackupEncryptionWarningBanner';

export type BackupPasswordSheetMode = 'export' | 'import';

type Props = {
  visible: boolean;
  mode: BackupPasswordSheetMode;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

const textInputPadding = IS_IOS ? { paddingTop: 11, paddingBottom: 11 } : { paddingVertical: 12 };
const passwordToggleHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

type PasswordFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  isVisible: boolean;
  onToggleVisible: () => void;
  toggleAccessibilityLabel: string;
  editable: boolean;
  returnKeyType: 'next' | 'done';
  onSubmitEditing?: () => void;
  color: Colors;
};

function BackupPasswordField({
  value,
  onChangeText,
  placeholder,
  isVisible,
  onToggleVisible,
  toggleAccessibilityLabel,
  editable,
  returnKeyType,
  onSubmitEditing,
  color,
}: PasswordFieldProps) {
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <View className="relative">
      <BottomSheetTextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={color.text.muted}
        className="rounded-xl border px-3 pr-11 text-[16px] leading-[22px]"
        style={{
          borderColor: color.border.default,
          color: color.text.primary,
          backgroundColor: color.background.secondary,
          ...textInputPadding,
        }}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable
        onPress={onToggleVisible}
        disabled={!editable}
        hitSlop={passwordToggleHitSlop}
        accessibilityRole="button"
        accessibilityLabel={toggleAccessibilityLabel}
        className="absolute bottom-0 right-0 top-0 w-11 items-center justify-center"
      >
        <ToggleIcon size={20} color={color.text.secondary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function BackupPasswordSheet({ visible, mode, busy = false, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
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
    setPasswordVisible(false);
    setConfirmVisible(false);
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

  const primaryLabel = t(isExport ? 'settings.export' : 'settings.import');

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={handleClose}
      enablePanDownToClose={!busy}
      backdropPressBehavior={busy ? 'none' : 'close'}
    >
      <AppBottomSheetContent>
        <SheetHeader title={title} subtitle={subtitle} color={c} marginBottom={16} />

        {isExport ? (
          <BackupEncryptionWarningBanner style={{ marginBottom: 16 }}>
            {t('settings.backupEncryption.noticeWarning')}
          </BackupEncryptionWarningBanner>
        ) : null}

        <Text className="mb-1.5 text-[13px] font-semibold" style={{ color: c.text.secondary }}>
          {t('settings.backupEncryption.passwordLabel')}
        </Text>
        <BackupPasswordField
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={t('settings.backupEncryption.passwordPlaceholder', {
            min: BACKUP_PASSWORD_MIN_LENGTH,
          })}
          isVisible={passwordVisible}
          onToggleVisible={() => setPasswordVisible((current) => !current)}
          toggleAccessibilityLabel={
            passwordVisible
              ? t('settings.backupEncryption.hidePassword')
              : t('settings.backupEncryption.showPassword')
          }
          editable={!busy}
          returnKeyType={isExport ? 'next' : 'done'}
          onSubmitEditing={isExport ? undefined : handleSubmit}
          color={c}
        />

        {isExport ? (
          <>
            <Text
              className="mb-1.5 mt-3 text-[13px] font-semibold"
              style={{ color: c.text.secondary }}
            >
              {t('settings.backupEncryption.confirmLabel')}
            </Text>
            <BackupPasswordField
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t('settings.backupEncryption.confirmPlaceholder', {
                min: BACKUP_PASSWORD_MIN_LENGTH,
              })}
              isVisible={confirmVisible}
              onToggleVisible={() => setConfirmVisible((current) => !current)}
              toggleAccessibilityLabel={
                confirmVisible
                  ? t('settings.backupEncryption.hidePassword')
                  : t('settings.backupEncryption.showPassword')
              }
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              color={c}
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
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
