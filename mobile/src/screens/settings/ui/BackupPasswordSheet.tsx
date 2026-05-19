import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { BACKUP_PASSWORD_MIN_LENGTH, validateBackupPassword } from '@/features/sync-data';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

export type BackupPasswordSheetMode = 'export' | 'import';

type Props = {
  visible: boolean;
  mode: BackupPasswordSheetMode;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

const textInputPadding = IS_IOS ? { paddingTop: 11, paddingBottom: 11 } : { paddingVertical: 12 };

/** Balances the cancel control so the title stays centered (RU «Отмена» / EN «Cancel»). */
const SHEET_HEADER_SIDE_WIDTH = 80;

export function BackupPasswordSheet({ visible, mode, busy = false, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
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
      <BottomSheetBackdrop {...props} pressBehavior={busy ? 'none' : 'close'} opacity={0.45} />
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
      <BottomSheetView className="px-5 pt-1" style={contentPadding}>
        <View className="mb-3 min-h-[44px] flex-row items-center">
          <View style={{ width: SHEET_HEADER_SIDE_WIDTH }} />
          <Text
            className="flex-1 text-center text-[17px] font-semibold leading-[22px]"
            style={{ color: c.text.primary }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{ width: SHEET_HEADER_SIDE_WIDTH, alignItems: 'flex-end' }}
          >
            <Text className="text-[17px] font-semibold" style={{ color: c.accent.primary }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="mb-3 px-2 text-center text-[13px] leading-[18px]"
          style={{ color: c.text.secondary }}
        >
          {subtitle}
        </Text>

        {isExport ? (
          <View
            className="mb-3 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: `${c.accent.delete}40`,
              backgroundColor: `${c.accent.delete}12`,
            }}
          >
            <Text
              className="text-center text-[13px] leading-[18px]"
              style={{ color: c.text.primary }}
            >
              {t('settings.backupEncryption.noticeWarning')}
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: c.text.secondary,
            marginBottom: 6,
          }}
        >
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
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: c.text.secondary,
                marginTop: 12,
                marginBottom: 6,
              }}
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
            className="mt-2 px-2 text-center text-[13px] leading-[18px]"
            style={{ color: c.accent.delete }}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View className="mt-4 w-full">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            label={primaryLabel}
            color={c}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={busy}
            activeOpacity={0.85}
            accessibilityLabel={primaryLabel}
          />
        </View>
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
