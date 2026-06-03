import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { ClipboardList, FileText, ListChecks, Mail, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, Text, TouchableOpacity, View } from 'react-native';

import {
  getLastShareRecipientEmail,
  pickDefaultEmailBodyTemplate,
  type ShareBriefTemplate,
} from '@/features/share-record';
import { EmailBodyFormatPicker } from '@/features/share-record/ui/EmailBodyFormatPicker';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import type { BatchExportPackaging } from '../model/batchExportPackaging';

function exportPackagingHintKey(packaging: BatchExportPackaging): string {
  if (packaging === 'zip') return 'batch.exportPackagingHintZip';
  if (packaging === 'pdf') return 'batch.exportPackagingHintPdf';
  return 'batch.exportPackagingHintSingle';
}

function exportEmailLimitReminderKey(packaging: BatchExportPackaging): string {
  if (packaging === 'pdf') return 'batch.emailPdfLimitReminder';
  if (packaging === 'zip') return 'batch.emailZipLimitReminder';
  return 'batch.emailLimitReminder';
}

function ExportPackagingChip({
  packaging,
  selectedPackaging,
  label,
  onSelect,
  color,
}: {
  packaging: BatchExportPackaging;
  selectedPackaging: BatchExportPackaging;
  label: string;
  onSelect: (p: BatchExportPackaging) => void;
  color: Colors;
}) {
  const selected = selectedPackaging === packaging;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onSelect(packaging)}
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

type BatchExportSheetProps = {
  visible: boolean;
  count: number;
  /** At least one selected Pro meeting (non-private) has non-empty `meetingDialogue`. */
  showSpeakerTurnsExport?: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onExportText: (template: ShareBriefTemplate, packaging: BatchExportPackaging) => void;
  onEmailBatch: (
    email: string,
    template: ShareBriefTemplate,
    packaging: BatchExportPackaging,
  ) => void;
};

export const BatchExportSheet = ({
  visible,
  count,
  showSpeakerTurnsExport = false,
  isSendingEmail = false,
  onClose,
  onExportText,
  onEmailBatch,
}: BatchExportSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
  const listContentPadding = useBottomSheetContentPadding(20);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailBodyTemplate, setEmailBodyTemplate] = useState<ShareBriefTemplate | null>(null);
  const [exportPackaging, setExportPackaging] = useState<BatchExportPackaging>('single');

  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

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
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setEmailBodyTemplate(null);
    setExportPackaging('single');
  }, [visible]);

  useEffect(() => {
    if (
      !showSpeakerTurnsExport &&
      (emailBodyTemplate === 'meetingSpeakerTurns' || emailBodyTemplate === 'meetingBrief')
    ) {
      setEmailBodyTemplate(defaultEmailBodyTemplate);
    }
  }, [defaultEmailBodyTemplate, emailBodyTemplate, showSpeakerTurnsExport]);

  const handleExportNoteBrief = useCallback(() => {
    onClose();
    onExportText('noteBrief', exportPackaging);
  }, [exportPackaging, onClose, onExportText]);

  const handleExportEmailBrief = useCallback(() => {
    onClose();
    onExportText('emailBrief', exportPackaging);
  }, [exportPackaging, onClose, onExportText]);

  const handleExportMeetingBrief = useCallback(() => {
    onClose();
    onExportText('meetingBrief', exportPackaging);
  }, [exportPackaging, onClose, onExportText]);

  const handleExportSpeakerTurns = useCallback(() => {
    onClose();
    onExportText('meetingSpeakerTurns', exportPackaging);
  }, [exportPackaging, onClose, onExportText]);

  const handleOpenEmail = useCallback(() => {
    setEmailBodyTemplate(defaultEmailBodyTemplate);
    setEmail(getLastShareRecipientEmail() ?? '');
    setEmailVisible(true);
  }, [defaultEmailBodyTemplate]);

  const handleCancelEmail = useCallback(() => {
    Keyboard.dismiss();
    setEmailVisible(false);
    setEmail('');
    setEmailBodyTemplate(null);
  }, []);

  const resolvedEmailTemplate = useMemo((): ShareBriefTemplate | null => {
    if (emailFormatTemplates.length === 1) {
      return emailFormatTemplates[0]!.tpl;
    }
    return emailBodyTemplate;
  }, [emailBodyTemplate, emailFormatTemplates]);

  const canSendEmail = emailValid && resolvedEmailTemplate != null && !isSendingEmail;

  const handleSendEmail = useCallback(() => {
    if (!canSendEmail || resolvedEmailTemplate == null) return;
    onEmailBatch(trimmedEmail, resolvedEmailTemplate, exportPackaging);
  }, [canSendEmail, exportPackaging, onEmailBatch, resolvedEmailTemplate, trimmedEmail]);

  const renderShareFormatRow = ({
    icon,
    title,
    description,
    onPress,
    accessibilityLabel,
    disabled = false,
    selected = false,
    showSelectionBorder = false,
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
    selected?: boolean;
    showSelectionBorder?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
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
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>{description}</Text>
      </View>
    </TouchableOpacity>
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
            {t('batch.emailBatchDescription')}
          </Text>

          <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('batch.exportPackagingLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <ExportPackagingChip
              packaging="single"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingSingle')}
              onSelect={setExportPackaging}
              color={color}
            />
            <ExportPackagingChip
              packaging="zip"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingZip')}
              onSelect={setExportPackaging}
              color={color}
            />
            <ExportPackagingChip
              packaging="pdf"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingPdf')}
              onSelect={setExportPackaging}
              color={color}
            />
          </View>
          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(exportPackagingHintKey(exportPackaging))}
          </Text>

          {emailFormatTemplates.length > 1 ? (
            <>
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('batch.emailBodyFormatHint')}
              </Text>
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t(exportEmailLimitReminderKey(exportPackaging))}
              </Text>

              <EmailBodyFormatPicker
                options={emailFormatTemplates}
                selected={emailBodyTemplate}
                onSelect={setEmailBodyTemplate}
                color={color}
              />
            </>
          ) : (
            <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
              {t(exportEmailLimitReminderKey(exportPackaging))}
            </Text>
          )}

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
            primaryDisabled={!canSendEmail}
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
            {t('batch.exportAsTitle', { count })}
          </Text>

          <Text style={{ fontSize: 13, color: color.text.muted, lineHeight: 18 }}>
            {t('batch.sheetLimitsHint')}
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}>
            {t('batch.exportPackagingLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <ExportPackagingChip
              packaging="single"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingSingle')}
              onSelect={setExportPackaging}
              color={color}
            />
            <ExportPackagingChip
              packaging="zip"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingZip')}
              onSelect={setExportPackaging}
              color={color}
            />
            <ExportPackagingChip
              packaging="pdf"
              selectedPackaging={exportPackaging}
              label={t('batch.exportPackagingPdf')}
              onSelect={setExportPackaging}
              color={color}
            />
          </View>
          <Text style={{ fontSize: 13, color: color.text.muted, lineHeight: 17 }}>
            {t(exportPackagingHintKey(exportPackaging))}
          </Text>

          {renderShareFormatRow({
            icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.noteBrief'),
            description: t('share.noteBriefDescription'),
            accessibilityLabel: t('share.noteBrief'),
            onPress: handleExportNoteBrief,
          })}

          {renderShareFormatRow({
            icon: <ClipboardList size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailBrief'),
            description: t('share.emailBriefDescription'),
            accessibilityLabel: t('share.emailBrief'),
            onPress: handleExportEmailBrief,
          })}

          {showSpeakerTurnsExport
            ? renderShareFormatRow({
                icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.meetingBrief'),
                description: t('share.meetingBriefDescription'),
                accessibilityLabel: t('share.meetingBrief'),
                onPress: handleExportMeetingBrief,
              })
            : null}

          {showSpeakerTurnsExport
            ? renderShareFormatRow({
                icon: <UsersRound size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.speakerTurnsBrief'),
                description: t('share.speakerTurnsBriefDescription'),
                accessibilityLabel: t('share.speakerTurnsBrief'),
                onPress: handleExportSpeakerTurns,
              })
            : null}

          {renderShareFormatRow({
            icon: <Mail size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailNote'),
            description: t('batch.emailBatchDescription'),
            accessibilityLabel: t('share.emailNote'),
            onPress: handleOpenEmail,
          })}
        </BottomSheetView>
      )}
    </AppBottomSheetModal>
  );
};
