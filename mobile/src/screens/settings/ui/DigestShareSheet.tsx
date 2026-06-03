import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { FileText, Mail } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { getLastShareRecipientEmail } from '@/features/share-record';
import type { ShareRecordExportFormat } from '@/features/share-record/model/shareRecordExportFormat';
import { type Colors, useColors } from '@/shared/config';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

function ShareExportFormatChip({
  format,
  selectedFormat,
  label,
  onSelect,
  color,
}: {
  format: ShareRecordExportFormat;
  selectedFormat: ShareRecordExportFormat;
  label: string;
  onSelect: (format: ShareRecordExportFormat) => void;
  color: Colors;
}) {
  const selected = selectedFormat === format;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onSelect(format)}
      className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
      style={{
        borderColor: selected ? color.accent.primary : color.border.default,
        backgroundColor: color.background.tertiary,
      }}
    >
      <Text
        className="text-center text-[15px] font-semibold leading-5"
        style={{ color: selected ? color.accent.primary : color.text.primary }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function shareExportFormatHintKey(format: ShareRecordExportFormat): string {
  return format === 'pdf' ? 'share.exportPackagingHintPdf' : 'share.exportPackagingHintMarkdown';
}

function shareEmailLimitReminderKey(format: ShareRecordExportFormat): string {
  return format === 'pdf' ? 'batch.emailPdfLimitReminder' : 'batch.emailLimitReminder';
}

type DigestShareSheetProps = {
  visible: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onShare: (format: ShareRecordExportFormat) => void;
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
  const contentPadding = useBottomSheetContentPadding(24);
  const listContentPadding = useBottomSheetContentPadding(20);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [exportFormat, setExportFormat] = useState<ShareRecordExportFormat>('markdown');
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  useEffect(() => {
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setExportFormat('markdown');
  }, [visible]);

  const handleShare = useCallback(() => {
    onClose();
    onShare(exportFormat);
  }, [exportFormat, onClose, onShare]);

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
    if (!emailValid || isSendingEmail) return;
    onEmail(trimmedEmail, exportFormat);
  }, [emailValid, exportFormat, isSendingEmail, onEmail, trimmedEmail]);

  const formatSection = (
    <>
      <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
        {t('batch.exportPackagingLabel')}
      </Text>
      <View className="flex-row gap-3">
        <ShareExportFormatChip
          format="markdown"
          selectedFormat={exportFormat}
          label={t('batch.exportPackagingSingle')}
          onSelect={setExportFormat}
          color={color}
        />
        <ShareExportFormatChip
          format="pdf"
          selectedFormat={exportFormat}
          label={t('batch.exportPackagingPdf')}
          onSelect={setExportFormat}
          color={color}
        />
      </View>
      <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t(shareExportFormatHintKey(exportFormat))}
      </Text>
    </>
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      {emailVisible ? (
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            ...contentPadding,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t('share.emailNote')}
          </Text>
          <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {t('settings.digest.emailDescription')}
          </Text>

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
            onPrimaryPressIn={handleSendEmail}
            primaryDisabled={!emailValid || isSendingEmail}
            primaryLoading={isSendingEmail}
            primaryAccessibilityLabel={t('share.sendEmail')}
            secondaryLabel={t('common.goBack')}
            onSecondaryPress={handleCancelEmail}
            onSecondaryPressIn={handleCancelEmail}
            secondaryDisabled={isSendingEmail}
          />
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView
          style={{
            paddingHorizontal: 20,
            paddingTop: 4,
            gap: 10,
            ...listContentPadding,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t('share.shareAsTitle')}
          </Text>

          {formatSection}

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
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
            <FileText size={20} color={color.text.primary} strokeWidth={2.1} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                {t('settings.digest.shareRecap')}
              </Text>
              <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>
                {t('settings.digest.shareRecapDescription')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenEmail}
            activeOpacity={0.7}
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
        </BottomSheetView>
      )}
    </AppBottomSheetModal>
  );
};
