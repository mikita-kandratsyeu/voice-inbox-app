import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { BarChart2, FileText, Mail } from 'lucide-react-native';
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
  return format === 'pdf'
    ? 'settings.digest.emailPdfLimitReminder'
    : 'settings.digest.emailLimitReminder';
}

export type DigestShareKind = 'aiDigest' | 'analytics';

type DigestShareSheetProps = {
  visible: boolean;
  isSendingEmail?: boolean;
  canShareAiDigest?: boolean;
  canShareAnalytics?: boolean;
  onClose: () => void;
  onShare: (format: ShareRecordExportFormat, kind: DigestShareKind) => Promise<void> | void;
  onEmail: (email: string, format: ShareRecordExportFormat, kind: DigestShareKind) => void;
};

export const DigestShareSheet = ({
  visible,
  isSendingEmail = false,
  canShareAiDigest = false,
  canShareAnalytics = true,
  onClose,
  onShare,
  onEmail,
}: DigestShareSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [exportFormat, setExportFormat] = useState<ShareRecordExportFormat>('markdown');
  const [sharingKind, setSharingKind] = useState<DigestShareKind | null>(null);
  const [emailKind, setEmailKind] = useState<DigestShareKind>('analytics');
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);
  const isSharing = sharingKind !== null;
  const showEmailKindPicker = canShareAnalytics && canShareAiDigest;

  const defaultEmailKind = useMemo((): DigestShareKind => {
    if (canShareAnalytics) return 'analytics';
    return 'aiDigest';
  }, [canShareAnalytics]);

  useEffect(() => {
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setExportFormat('markdown');
    setSharingKind(null);
    setEmailKind('analytics');
  }, [visible]);

  const handleShare = useCallback(
    async (kind: DigestShareKind) => {
      if (isSharing) return;
      setSharingKind(kind);
      try {
        await onShare(exportFormat, kind);
        onClose();
      } finally {
        setSharingKind(null);
      }
    },
    [exportFormat, isSharing, onClose, onShare],
  );

  const handleSelectExportFormat = useCallback(
    (format: ShareRecordExportFormat) => {
      if (isSharing) return;
      setExportFormat(format);
    },
    [isSharing],
  );

  const handleSelectEmailKind = useCallback(
    (kind: DigestShareKind) => {
      if (isSharing || isSendingEmail) return;
      setEmailKind(kind);
    },
    [isSendingEmail, isSharing],
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
    if (isSharing) return;
    setEmailKind(defaultEmailKind);
    setEmail(getLastShareRecipientEmail() ?? '');
    setEmailVisible(true);
  }, [defaultEmailKind, isSharing]);

  const handleSendEmail = useCallback(() => {
    if (!emailValid || isSendingEmail || isSharing) return;
    onEmail(trimmedEmail, exportFormat, emailKind);
  }, [emailKind, emailValid, exportFormat, isSendingEmail, isSharing, onEmail, trimmedEmail]);

  const emailKindDescriptionKey =
    emailKind === 'analytics'
      ? 'settings.digest.shareAnalyticsDescription'
      : 'settings.digest.shareRecapDescription';

  const shareRowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: color.background.tertiary,
    gap: 10,
  };

  const renderShareRow = (
    kind: DigestShareKind,
    icon: React.ReactNode,
    title: string,
    description: string,
    accessibilityLabel: string,
  ) => {
    const loading = sharingKind === kind;
    const disabled = isSharing && !loading;

    return (
      <TouchableOpacity
        onPress={() => void handleShare(kind)}
        disabled={disabled || loading}
        activeOpacity={disabled || loading ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={shareRowStyle}
      >
        {loading ? <ActivityIndicator size="small" color={color.accent.primary} /> : icon}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
            {loading ? t('settings.digest.exportPreparing') : title}
          </Text>
          <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>{description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          disabled={isSharing || isSendingEmail}
        />
        <SheetSelectionChip
          value="pdf"
          selectedValue={exportFormat}
          label={t('batch.exportPackagingPdf')}
          onSelect={handleSelectExportFormat}
          color={color}
          disabled={isSharing || isSendingEmail}
        />
      </View>
      <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t(shareExportFormatHintKey(exportFormat))}
      </Text>
    </>
  );

  const emailKindSection = showEmailKindPicker ? (
    <>
      <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
        {t('settings.digest.emailContentLabel')}
      </Text>
      <View className="flex-row gap-3">
        <SheetSelectionChip
          value="analytics"
          selectedValue={emailKind}
          label={t('settings.digest.shareAnalytics')}
          onSelect={handleSelectEmailKind}
          color={color}
          disabled={isSharing || isSendingEmail}
        />
        <SheetSelectionChip
          value="aiDigest"
          selectedValue={emailKind}
          label={t('settings.digest.shareRecap')}
          onSelect={handleSelectEmailKind}
          color={color}
          disabled={isSharing || isSendingEmail}
        />
      </View>
      <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t(emailKindDescriptionKey)}
      </Text>
    </>
  ) : null;

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      {emailVisible ? (
        <AppBottomSheetContent scrollable style={{ paddingTop: 4, gap: 12 }}>
          <SheetHeader
            title={t('share.emailNote')}
            subtitle={t('settings.digest.emailSheetDescription')}
            color={color}
            marginBottom={8}
          />

          {formatSection}

          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(shareEmailLimitReminderKey(exportFormat))}
          </Text>

          {emailKindSection}

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

          {canShareAnalytics
            ? renderShareRow(
                'analytics',
                <BarChart2 size={20} color={color.text.primary} strokeWidth={2.1} />,
                t('settings.digest.shareAnalytics'),
                t('settings.digest.shareAnalyticsDescription'),
                t('settings.digest.shareAnalytics'),
              )
            : null}

          {canShareAiDigest
            ? renderShareRow(
                'aiDigest',
                <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
                t('settings.digest.shareRecap'),
                t('settings.digest.shareRecapDescription'),
                t('settings.digest.shareRecap'),
              )
            : null}

          <TouchableOpacity
            onPress={handleOpenEmail}
            disabled={isSharing}
            activeOpacity={isSharing ? 1 : 0.7}
            accessibilityRole="button"
            accessibilityLabel={t('share.emailNote')}
            style={shareRowStyle}
          >
            <Mail size={20} color={color.text.primary} strokeWidth={2.1} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
                {t('share.emailNote')}
              </Text>
              <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>
                {t('settings.digest.emailSheetDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </AppBottomSheetContent>
      )}
    </AppBottomSheetModal>
  );
};
