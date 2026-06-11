import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FileText, Mail } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, Text, TouchableOpacity, View } from 'react-native';

import { getLastShareRecipientEmail } from '@/features/share-record';
import type { ShareRecordExportFormat } from '@/features/share-record/model/shareRecordExportFormat';
import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
  SheetSelectionChip,
} from '@/shared/ui';

function shareExportFormatHintKey(format: ShareRecordExportFormat): string {
  return format === 'pdf'
    ? 'settings.digest.exportPackagingHintPdf'
    : 'settings.digest.exportPackagingHintMarkdown';
}

function shareEmailLimitReminderKey(format: ShareRecordExportFormat): string {
  return format === 'pdf' ? 'batch.emailPdfLimitReminder' : 'batch.emailLimitReminder';
}

type DigestShareSheetProps = {
  visible: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onShare: (format: ShareRecordExportFormat) => Promise<void> | void;
  onEmail: (email: string, format: ShareRecordExportFormat) => void;
};

export const DigestShareSheet = ({
  visible,
  isSendingEmail = false,
  onClose,
  onShare,
  onEmail,
}: DigestShareSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [exportFormat, setExportFormat] = useState<ShareRecordExportFormat>('markdown');
  const [isSharing, setIsSharing] = useState(false);
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  useEffect(() => {
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setExportFormat('markdown');
    setIsSharing(false);
  }, [visible]);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await onShare(exportFormat);
      onClose();
    } finally {
      setIsSharing(false);
    }
  }, [exportFormat, isSharing, onClose, onShare]);

  const handleSelectExportFormat = useCallback(
    (format: ShareRecordExportFormat) => {
      if (isSharing) return;
      setExportFormat(format);
    },
    [isSharing],
  );

  const handleClose = useCallback(() => {
    if (isSharing) return;
    onClose();
  }, [isSharing, onClose]);

  const handleCancelEmail = useCallback(() => {
    Keyboard.dismiss();
    setEmailVisible(false);
    setEmail('');
  }, []);

  const handleOpenEmail = useCallback(() => {
    setEmail(getLastShareRecipientEmail() ?? '');
    setEmailVisible(true);
  }, []);

  const handleSendEmail = useCallback(() => {
    if (!emailValid || isSendingEmail || isSharing) return;
    onEmail(trimmedEmail, exportFormat);
  }, [emailValid, exportFormat, isSendingEmail, isSharing, onEmail, trimmedEmail]);

  const formatSection = (
    <>
      <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
        {t('batch.exportPackagingLabel')}
      </Text>
      <View className="flex-row gap-3">
        <SheetSelectionChip
          value="markdown"
          selectedValue={exportFormat}
          label={t('batch.exportPackagingSingle')}
          onSelect={handleSelectExportFormat}
          color={color}
        />
        <SheetSelectionChip
          value="pdf"
          selectedValue={exportFormat}
          label={t('batch.exportPackagingPdf')}
          onSelect={handleSelectExportFormat}
          color={color}
        />
      </View>
      <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t(shareExportFormatHintKey(exportFormat))}
      </Text>
    </>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      {emailVisible ? (
        <AppBottomSheetContent scrollable style={{ paddingTop: 4, gap: 12 }}>
          <SheetHeader
            title={t('share.emailNote')}
            subtitle={t('settings.digest.emailDescription')}
            color={color}
            marginBottom={8}
          />

          {formatSection}

          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(shareEmailLimitReminderKey(exportFormat))}
          </Text>

          <BottomSheetTextInput
            className="rounded-xl border-2 px-4 py-3 text-[16px]"
            style={{
              borderColor: color.accent.primary,
              color: color.text.primary,
              backgroundColor: color.background.tertiary,
            }}
            value={email}
            onChangeText={setEmail}
            placeholder={t('share.emailPlaceholder')}
            placeholderTextColor={color.text.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            autoFocus
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSendEmail}
            accessibilityLabel={t('share.emailPlaceholder')}
          />

          <SheetFooterButtons
            className="mt-1 w-full"
            color={color}
            primaryLabel={t('share.sendEmail')}
            onPrimaryPress={handleSendEmail}
            primaryDisabled={!emailValid || isSendingEmail || isSharing}
            primaryLoading={isSendingEmail}
            primaryAccessibilityLabel={t('share.sendEmail')}
            secondaryLabel={t('common.goBack')}
            onSecondaryPress={handleCancelEmail}
            onSecondaryPressIn={handleCancelEmail}
            secondaryDisabled={isSendingEmail || isSharing}
          />
        </AppBottomSheetContent>
      ) : (
        <AppBottomSheetContent bottomPadding={20} style={{ paddingTop: 4, gap: 10 }}>
          <SheetHeader title={t('share.shareAsTitle')} color={color} marginBottom={8} />

          {formatSection}

          <TouchableOpacity
            onPress={handleShare}
            disabled={isSharing}
            activeOpacity={isSharing ? 1 : 0.7}
            accessibilityRole="button"
            accessibilityLabel={t('settings.digest.shareRecap')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: color.background.tertiary,
              gap: 10,
            }}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={color.accent.primary} />
            ) : (
              <FileText size={20} color={color.text.primary} strokeWidth={2.1} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                {isSharing ? t('settings.digest.exportPreparing') : t('settings.digest.shareRecap')}
              </Text>
              <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>
                {t('settings.digest.shareRecapDescription')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenEmail}
            disabled={isSharing}
            activeOpacity={isSharing ? 1 : 0.7}
            accessibilityRole="button"
            accessibilityLabel={t('share.emailNote')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: color.background.tertiary,
              gap: 10,
            }}
          >
            <Mail size={20} color={color.text.primary} strokeWidth={2.1} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                {t('share.emailNote')}
              </Text>
              <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>
                {t('settings.digest.emailDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </AppBottomSheetContent>
      )}
    </AppBottomSheetModal>
  );
};
