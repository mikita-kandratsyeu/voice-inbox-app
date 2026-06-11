import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ClipboardList, FileText, ListChecks, Mail, Music, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, Text, TouchableOpacity, View } from 'react-native';

import {
  getLastShareRecipientEmail,
  pickDefaultEmailBodyTemplate,
  type ShareBriefTemplate,
  type ShareRecordExportFormat,
} from '@/features/share-record';
import { EmailBodyFormatPicker } from '@/features/share-record/ui/EmailBodyFormatPicker';
import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
  SheetSelectionChip,
} from '@/shared/ui';

function shareExportFormatHintKey(format: ShareRecordExportFormat): string {
  return format === 'pdf' ? 'share.exportPackagingHintPdf' : 'share.exportPackagingHintMarkdown';
}

function shareEmailLimitReminderKey(format: ShareRecordExportFormat): string {
  return format === 'pdf' ? 'batch.emailPdfLimitReminder' : 'batch.emailLimitReminder';
}

type ShareRecordSheetProps = {
  visible: boolean;
  hasAudio: boolean;
  isMeeting?: boolean;
  showSpeakerTurnsExport?: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onShareText: (
    template: ShareBriefTemplate,
    format: ShareRecordExportFormat,
  ) => Promise<void> | void;
  onEmailRecord: (
    email: string,
    template: ShareBriefTemplate,
    format: ShareRecordExportFormat,
  ) => void;
  onShareAudio: () => void;
};

export const ShareRecordSheet = ({
  visible,
  hasAudio,
  isMeeting = false,
  showSpeakerTurnsExport = false,
  isSendingEmail = false,
  onClose,
  onShareText,
  onEmailRecord,
  onShareAudio,
}: ShareRecordSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSendTemplate, setEmailSendTemplate] = useState<ShareBriefTemplate | null>(null);
  const [exportFormat, setExportFormat] = useState<ShareRecordExportFormat>('markdown');
  const [sharingTemplate, setSharingTemplate] = useState<ShareBriefTemplate | null>(null);
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  useEffect(() => {
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setEmailSendTemplate(null);
    setExportFormat('markdown');
    setSharingTemplate(null);
  }, [visible]);

  const isSharing = sharingTemplate != null;

  const handleShareText = useCallback(
    async (template: ShareBriefTemplate) => {
      if (isSharing) return;
      setSharingTemplate(template);
      try {
        await onShareText(template, exportFormat);
        onClose();
      } finally {
        setSharingTemplate(null);
      }
    },
    [exportFormat, isSharing, onClose, onShareText],
  );

  const handleShareNoteBrief = useCallback(() => {
    void handleShareText('noteBrief');
  }, [handleShareText]);

  const handleShareEmailBrief = useCallback(() => {
    void handleShareText('emailBrief');
  }, [handleShareText]);

  const handleShareMeetingBrief = useCallback(() => {
    void handleShareText('meetingBrief');
  }, [handleShareText]);

  const handleShareSpeakerTurns = useCallback(() => {
    void handleShareText('meetingSpeakerTurns');
  }, [handleShareText]);

  const handleShareAudio = useCallback(() => {
    if (isSharing) return;
    onClose();
    onShareAudio();
  }, [isSharing, onClose, onShareAudio]);

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
    setEmailSendTemplate(null);
  }, []);

  const renderShareFormatRow = ({
    icon,
    title,
    description,
    onPress,
    disabled = false,
    loading = false,
    selected = false,
    showSelectionBorder = false,
    accessibilityLabel,
  }: {
    icon: ReactNode;
    title: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    selected?: boolean;
    showSelectionBorder?: boolean;
    accessibilityLabel: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={disabled || loading ? 1 : 0.7}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: showSelectionBorder
          ? selected
            ? color.accent.primary
            : color.border.default
          : 'transparent',
        backgroundColor: color.background.tertiary,
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {loading ? <ActivityIndicator size="small" color={color.accent.primary} /> : icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>
          {loading ? t('share.exportPreparing') : title}
        </Text>
        {description ? (
          <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const emailFormatTemplates = useMemo(() => {
    const noteBriefOption = {
      tpl: 'noteBrief' as const,
      Icon: FileText,
      chipLabel: t('share.emailFormatChipNote'),
      accessibilityHint: t('share.noteBriefDescription'),
    };
    const emailBriefOption = {
      tpl: 'emailBrief' as const,
      Icon: ClipboardList,
      chipLabel: t('share.emailFormatChipBrief'),
      accessibilityHint: t('share.emailBriefDescription'),
    };

    if (showSpeakerTurnsExport) {
      return [
        noteBriefOption,
        emailBriefOption,
        {
          tpl: 'meetingBrief' as const,
          Icon: ListChecks,
          chipLabel: t('share.emailFormatChipMeeting'),
          accessibilityHint: t('share.meetingBriefDescription'),
        },
        {
          tpl: 'meetingSpeakerTurns' as const,
          Icon: UsersRound,
          chipLabel: t('share.emailFormatChipSpeakers'),
          accessibilityHint: t('share.speakerTurnsBriefDescription'),
        },
      ];
    }

    return [emailBriefOption, noteBriefOption];
  }, [showSpeakerTurnsExport, t]);

  const defaultEmailBodyTemplate = useMemo(
    () => pickDefaultEmailBodyTemplate(emailFormatTemplates.map((option) => option.tpl)),
    [emailFormatTemplates],
  );

  useEffect(() => {
    if (
      !showSpeakerTurnsExport &&
      (emailSendTemplate === 'meetingSpeakerTurns' || emailSendTemplate === 'meetingBrief')
    ) {
      setEmailSendTemplate(defaultEmailBodyTemplate);
    }
  }, [defaultEmailBodyTemplate, emailSendTemplate, showSpeakerTurnsExport]);

  const resolvedEmailTemplate = useMemo((): ShareBriefTemplate | null => {
    if (emailFormatTemplates.length === 1) {
      return emailFormatTemplates[0]!.tpl;
    }
    return emailSendTemplate;
  }, [emailFormatTemplates, emailSendTemplate]);

  const canSendEmail = emailValid && resolvedEmailTemplate != null && !isSendingEmail && !isSharing;

  const handleOpenEmail = useCallback(() => {
    if (isSharing) return;
    setEmailSendTemplate(defaultEmailBodyTemplate);
    setEmail(getLastShareRecipientEmail() ?? '');
    setEmailVisible(true);
  }, [defaultEmailBodyTemplate, isSharing]);

  const handleSendEmail = useCallback(() => {
    if (!canSendEmail || resolvedEmailTemplate == null || isSharing) return;
    onEmailRecord(trimmedEmail, resolvedEmailTemplate, exportFormat);
  }, [canSendEmail, exportFormat, isSharing, onEmailRecord, resolvedEmailTemplate, trimmedEmail]);

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      {emailVisible ? (
        <AppBottomSheetContent scrollable style={{ paddingTop: 4, gap: 12 }}>
          <SheetHeader
            title={t('share.emailNote')}
            subtitle={t(isMeeting ? 'share.emailMeetingDescription' : 'share.emailNoteDescription')}
            color={color}
            marginBottom={8}
          />

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
              disabled={isSharing}
            />
            <SheetSelectionChip
              value="pdf"
              selectedValue={exportFormat}
              label={t('batch.exportPackagingPdf')}
              onSelect={handleSelectExportFormat}
              color={color}
              disabled={isSharing}
            />
          </View>
          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(shareExportFormatHintKey(exportFormat))}
          </Text>
          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(shareEmailLimitReminderKey(exportFormat))}
          </Text>

          {emailFormatTemplates.length > 1 ? (
            <>
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('batch.emailBodyFormatHint')}
              </Text>
              <EmailBodyFormatPicker
                options={emailFormatTemplates}
                selected={emailSendTemplate}
                onSelect={setEmailSendTemplate}
                color={color}
              />
            </>
          ) : null}

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
            primaryDisabled={!canSendEmail}
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
              disabled={isSharing}
            />
            <SheetSelectionChip
              value="pdf"
              selectedValue={exportFormat}
              label={t('batch.exportPackagingPdf')}
              onSelect={handleSelectExportFormat}
              color={color}
              disabled={isSharing}
            />
          </View>
          <Text style={{ fontSize: 13, color: color.text.muted, lineHeight: 17 }}>
            {t(shareExportFormatHintKey(exportFormat))}
          </Text>

          {renderShareFormatRow({
            icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.noteBrief'),
            description: t('share.noteBriefDescription'),
            accessibilityLabel: t('share.noteBrief'),
            onPress: handleShareNoteBrief,
            disabled: isSharing && sharingTemplate !== 'noteBrief',
            loading: sharingTemplate === 'noteBrief',
          })}

          {renderShareFormatRow({
            icon: <ClipboardList size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailBrief'),
            description: t('share.emailBriefDescription'),
            accessibilityLabel: t('share.emailBrief'),
            onPress: handleShareEmailBrief,
            disabled: isSharing && sharingTemplate !== 'emailBrief',
            loading: sharingTemplate === 'emailBrief',
          })}

          {showSpeakerTurnsExport
            ? renderShareFormatRow({
                icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.meetingBrief'),
                description: t('share.meetingBriefDescription'),
                accessibilityLabel: t('share.meetingBrief'),
                onPress: handleShareMeetingBrief,
                disabled: isSharing && sharingTemplate !== 'meetingBrief',
                loading: sharingTemplate === 'meetingBrief',
              })
            : null}

          {showSpeakerTurnsExport
            ? renderShareFormatRow({
                icon: <UsersRound size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.speakerTurnsBrief'),
                description: t('share.speakerTurnsBriefDescription'),
                accessibilityLabel: t('share.speakerTurnsBrief'),
                onPress: handleShareSpeakerTurns,
                disabled: isSharing && sharingTemplate !== 'meetingSpeakerTurns',
                loading: sharingTemplate === 'meetingSpeakerTurns',
              })
            : null}

          {renderShareFormatRow({
            icon: <Mail size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailNote'),
            description: t(
              isMeeting ? 'share.emailMeetingDescription' : 'share.emailNoteDescription',
            ),
            accessibilityLabel: t('share.emailNote'),
            onPress: handleOpenEmail,
            disabled: isSharing,
          })}

          {renderShareFormatRow({
            icon: <Music size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.shareAudio'),
            description: hasAudio ? undefined : t('share.noAudio'),
            accessibilityLabel: t('share.shareAudio'),
            disabled: !hasAudio || isSharing,
            onPress: handleShareAudio,
          })}
        </AppBottomSheetContent>
      )}
    </AppBottomSheetModal>
  );
};
