import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { FileText, ListChecks, Mail, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, Text, TouchableOpacity, View } from 'react-native';

import type { ShareBriefTemplate } from '@/features/share-record';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

import type { BatchExportPackaging } from '../model/batchExportPackaging';

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

function emailTemplateChipLabel(tpl: ShareBriefTemplate, t: (key: string) => string): string {
  if (tpl === 'emailBrief') return t('share.emailBrief');
  if (tpl === 'meetingBrief') return t('share.meetingBrief');
  if (tpl === 'meetingSpeakerTurns') return t('share.speakerTurnsBrief');
  return t('share.noteBrief');
}

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
  const [emailBodyTemplate, setEmailBodyTemplate] = useState<ShareBriefTemplate>('emailBrief');
  const [exportPackaging, setExportPackaging] = useState<BatchExportPackaging>('single');

  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  const emailFormatTemplates = useMemo((): ShareBriefTemplate[] => {
    if (showSpeakerTurnsExport) {
      return ['emailBrief', 'meetingBrief', 'meetingSpeakerTurns'];
    }
    return ['emailBrief', 'noteBrief'];
  }, [showSpeakerTurnsExport]);

  useEffect(() => {
    if (visible) return;
    setEmailVisible(false);
    setEmail('');
    setEmailBodyTemplate('emailBrief');
    setExportPackaging('single');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setEmailBodyTemplate((prev) => (emailFormatTemplates.includes(prev) ? prev : 'emailBrief'));
  }, [emailFormatTemplates, visible]);

  useEffect(() => {
    if (!showSpeakerTurnsExport && emailBodyTemplate === 'meetingSpeakerTurns') {
      setEmailBodyTemplate('emailBrief');
    }
  }, [emailBodyTemplate, showSpeakerTurnsExport]);

  const handleExportNoteBrief = useCallback(() => {
    onClose();
    onExportText('noteBrief', exportPackaging);
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
    setEmailVisible(true);
  }, []);

  const handleCancelEmail = useCallback(() => {
    Keyboard.dismiss();
    setEmailVisible(false);
    setEmail('');
  }, []);

  const handleSendEmail = useCallback(() => {
    if (!emailValid || isSendingEmail) return;
    onEmailBatch(trimmedEmail, emailBodyTemplate, exportPackaging);
  }, [emailBodyTemplate, emailValid, exportPackaging, isSendingEmail, onEmailBatch, trimmedEmail]);

  const renderOption = ({
    icon,
    title,
    description,
    onPress,
    accessibilityLabel,
    disabled = false,
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
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
          <View className="flex-row gap-3">
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
          </View>
          <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
            {exportPackaging === 'zip'
              ? t('batch.exportPackagingHintZip')
              : t('batch.exportPackagingHintSingle')}
          </Text>

          {emailFormatTemplates.length > 1 ? (
            <>
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('batch.emailBodyFormatHint')}
              </Text>
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {exportPackaging === 'zip'
                  ? t('batch.emailZipLimitReminder')
                  : t('batch.emailLimitReminder')}
              </Text>

              <View className="flex-row gap-3">
                {emailFormatTemplates.map((tpl) => {
                  const label = emailTemplateChipLabel(tpl, t);
                  const selected = emailBodyTemplate === tpl;
                  return (
                    <Pressable
                      key={tpl}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={label}
                      onPress={() => setEmailBodyTemplate(tpl)}
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
          ) : (
            <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
              {exportPackaging === 'zip'
                ? t('batch.emailZipLimitReminder')
                : t('batch.emailLimitReminder')}
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
            {t('batch.exportAsTitle', { count })}
          </Text>

          <Text style={{ fontSize: 13, color: color.text.muted, lineHeight: 18 }}>
            {t('batch.sheetLimitsHint')}
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}>
            {t('batch.exportPackagingLabel')}
          </Text>
          <View className="flex-row gap-3">
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
          </View>
          <Text style={{ fontSize: 12, color: color.text.muted, lineHeight: 17 }}>
            {exportPackaging === 'zip'
              ? t('batch.exportPackagingHintZip')
              : t('batch.exportPackagingHintSingle')}
          </Text>

          {renderOption({
            icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.noteBrief'),
            description: t('share.noteBriefDescription'),
            accessibilityLabel: t('share.noteBrief'),
            onPress: handleExportNoteBrief,
          })}

          {renderOption({
            icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.meetingBrief'),
            description: t('share.meetingBriefDescription'),
            accessibilityLabel: t('share.meetingBrief'),
            onPress: handleExportMeetingBrief,
          })}

          {showSpeakerTurnsExport
            ? renderOption({
                icon: <UsersRound size={20} color={color.text.primary} strokeWidth={2.1} />,
                title: t('share.speakerTurnsBrief'),
                description: t('share.speakerTurnsBriefDescription'),
                accessibilityLabel: t('share.speakerTurnsBrief'),
                onPress: handleExportSpeakerTurns,
              })
            : null}

          {renderOption({
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
