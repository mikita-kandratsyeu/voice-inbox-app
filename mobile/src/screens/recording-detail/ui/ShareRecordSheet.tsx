import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { ClipboardList, FileText, ListChecks, Mail, Music, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, Text, TouchableOpacity, View } from 'react-native';

import type { ShareBriefTemplate } from '@/features/share-record';
import type { ShareRecordExportFormat } from '@/features/share-record';
import { type Colors, useColors } from '@/shared/config';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

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

type ShareRecordSheetProps = {
  visible: boolean;
  hasAudio: boolean;
  isMeeting?: boolean;
  showSpeakerTurnsExport?: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onShareText: (template: ShareBriefTemplate, format: ShareRecordExportFormat) => void;
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
  const contentPadding = useBottomSheetContentPadding(24);
  const listContentPadding = useBottomSheetContentPadding(20);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSendTemplate, setEmailSendTemplate] = useState<ShareBriefTemplate>('emailBrief');
  const [exportFormat, setExportFormat] = useState<ShareRecordExportFormat>('markdown');
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  useEffect(() => {
    if (visible) {
      setEmailSendTemplate('emailBrief');
      return;
    }
    setEmailVisible(false);
    setEmail('');
    setExportFormat('markdown');
  }, [visible]);

  useEffect(() => {
    if (
      !showSpeakerTurnsExport &&
      (emailSendTemplate === 'meetingSpeakerTurns' || emailSendTemplate === 'meetingBrief')
    ) {
      setEmailSendTemplate('emailBrief');
    }
  }, [emailSendTemplate, showSpeakerTurnsExport]);

  const handleShareNoteBrief = useCallback(() => {
    onClose();
    onShareText('noteBrief', exportFormat);
  }, [exportFormat, onClose, onShareText]);

  const handleShareEmailBrief = useCallback(() => {
    onClose();
    onShareText('emailBrief', exportFormat);
  }, [exportFormat, onClose, onShareText]);

  const handleShareMeetingBrief = useCallback(() => {
    onClose();
    onShareText('meetingBrief', exportFormat);
  }, [exportFormat, onClose, onShareText]);

  const handleShareSpeakerTurns = useCallback(() => {
    onClose();
    onShareText('meetingSpeakerTurns', exportFormat);
  }, [exportFormat, onClose, onShareText]);

  const handleShareAudio = useCallback(() => {
    onClose();
    onShareAudio();
  }, [onClose, onShareAudio]);

  const handleOpenEmail = useCallback(() => {
    setEmailVisible(true);
  }, []);

  const handleCancelEmail = useCallback(() => {
    Keyboard.dismiss();
    setEmailVisible(false);
    setEmail('');
  }, []);

  const handleSendEmail = useCallback(() => {
    if (!emailValid || isSendingEmail) return;
    onEmailRecord(trimmedEmail, emailSendTemplate, exportFormat);
  }, [emailSendTemplate, emailValid, exportFormat, isSendingEmail, onEmailRecord, trimmedEmail]);

  const renderOption = ({
    icon,
    title,
    description,
    onPress,
    disabled = false,
    accessibilityLabel,
  }: {
    icon: ReactNode;
    title: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: color.background.tertiary,
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: color.text.primary, fontWeight: '500' }}>{title}</Text>
        {description ? (
          <Text style={{ fontSize: 13, color: color.text.muted, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const emailFormatTemplates = useMemo((): { tpl: ShareBriefTemplate; label: string }[] => {
    const row: { tpl: ShareBriefTemplate; label: string }[] = [
      { tpl: 'emailBrief', label: t('share.emailBrief') },
    ];
    if (showSpeakerTurnsExport) {
      row.push(
        { tpl: 'meetingBrief', label: t('share.meetingBrief') },
        { tpl: 'meetingSpeakerTurns', label: t('share.speakerTurnsBrief') },
      );
    } else {
      row.push({ tpl: 'noteBrief', label: t('share.noteBrief') });
    }
    return row;
  }, [showSpeakerTurnsExport, t]);

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
            {t(isMeeting ? 'share.emailMeetingDescription' : 'share.emailNoteDescription')}
          </Text>

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
          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {t(shareEmailLimitReminderKey(exportFormat))}
          </Text>

          {emailFormatTemplates.length > 1 ? (
            <>
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('batch.emailBodyFormatHint')}
              </Text>
              <View className="flex-row gap-3">
                {emailFormatTemplates.map(({ tpl, label }) => {
                  const selected = emailSendTemplate === tpl;
                  return (
                    <Pressable
                      key={tpl}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={label}
                      onPress={() => setEmailSendTemplate(tpl)}
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
                })}
              </View>
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

          <View className="mt-1 flex-row gap-3">
            <Button
              variant="secondary"
              label={t('common.goBack')}
              onPress={handleCancelEmail}
              onPressIn={handleCancelEmail}
              activeOpacity={0.8}
              className="min-w-0 flex-1"
              color={color}
              disabled={isSendingEmail}
              containerStyle={{
                backgroundColor: color.background.tertiary,
                borderRadius: 12,
              }}
              accessibilityLabel={t('common.goBack')}
            />
            <Button
              variant="primary"
              label={t('share.sendEmail')}
              onPress={handleSendEmail}
              activeOpacity={0.85}
              className="min-w-0 flex-1"
              color={color}
              disabled={!emailValid}
              loading={isSendingEmail}
              containerStyle={{
                backgroundColor: color.accent.primary,
                borderRadius: 12,
              }}
              accessibilityLabel={t('share.sendEmail')}
            />
          </View>
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
          <Text style={{ fontSize: 13, color: color.text.muted, lineHeight: 17 }}>
            {t(shareExportFormatHintKey(exportFormat))}
          </Text>

          {renderOption({
            icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.noteBrief'),
            description: t('share.noteBriefDescription'),
            accessibilityLabel: t('share.noteBrief'),
            onPress: handleShareNoteBrief,
          })}

          {renderOption({
            icon: <ClipboardList size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailBrief'),
            description: t('share.emailBriefDescription'),
            accessibilityLabel: t('share.emailBrief'),
            onPress: handleShareEmailBrief,
          })}

          {showSpeakerTurnsExport
            ? renderOption({
                icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.meetingBrief'),
                description: t('share.meetingBriefDescription'),
                accessibilityLabel: t('share.meetingBrief'),
                onPress: handleShareMeetingBrief,
              })
            : null}

          {showSpeakerTurnsExport
            ? renderOption({
                icon: <UsersRound size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.speakerTurnsBrief'),
                description: t('share.speakerTurnsBriefDescription'),
                accessibilityLabel: t('share.speakerTurnsBrief'),
                onPress: handleShareSpeakerTurns,
              })
            : null}

          {renderOption({
            icon: <Mail size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.emailNote'),
            description: t(
              isMeeting ? 'share.emailMeetingDescription' : 'share.emailNoteDescription',
            ),
            accessibilityLabel: t('share.emailNote'),
            onPress: handleOpenEmail,
          })}

          {renderOption({
            icon: <Music size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.shareAudio'),
            description: hasAudio ? undefined : t('share.noAudio'),
            accessibilityLabel: t('share.shareAudio'),
            disabled: !hasAudio,
            onPress: handleShareAudio,
          })}
        </BottomSheetView>
      )}
    </AppBottomSheetModal>
  );
};
