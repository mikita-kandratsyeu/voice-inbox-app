import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { FileText, ListChecks, Mail, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShareBriefTemplate } from '@/features/share-record';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

import type { BatchExportPackaging } from '../model/batchExportPackaging';

function EmailBodyFormatChip({
  template,
  label,
  selectedTemplate,
  onSelect,
  color,
}: {
  template: ShareBriefTemplate;
  label: string;
  selectedTemplate: ShareBriefTemplate;
  onSelect: (t: ShareBriefTemplate) => void;
  color: Colors;
}) {
  const selected = selectedTemplate === template;
  return (
    <TouchableOpacity
      onPress={() => onSelect(template)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: 44,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: selected ? color.accent.primary : color.border.default,
        backgroundColor: selected ? color.background.secondary : color.background.primary,
      }}
    >
      <Text
        style={{
          width: '100%',
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 17,
          textAlign: 'center',
          color: selected ? color.accent.primary : color.text.primary,
        }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
    <TouchableOpacity
      onPress={() => onSelect(packaging)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: selected ? color.accent.primary : color.border.default,
        backgroundColor: selected ? color.background.secondary : color.background.primary,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: selected ? color.accent.primary : color.text.primary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type BatchExportSheetProps = {
  visible: boolean;
  count: number;
  isSendingEmail?: boolean;
  onClose: () => void;
  onExportText: (template: ShareBriefTemplate, packaging: BatchExportPackaging) => void;
  onEmailBatch: (
    email: string,
    template: ShareBriefTemplate,
    packaging: BatchExportPackaging,
  ) => void;
};

const BATCH_EMAIL_FORMAT_TEMPLATES: ShareBriefTemplate[] = ['meetingBrief', 'meetingSpeakerTurns'];

function emailTemplateChipLabel(tpl: ShareBriefTemplate, t: (key: string) => string): string {
  if (tpl === 'meetingBrief') return t('share.meetingBrief');
  return t('share.speakerTurnsBrief');
}

export const BatchExportSheet = ({
  visible,
  count,
  isSendingEmail = false,
  onClose,
  onExportText,
  onEmailBatch,
}: BatchExportSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailBodyTemplate, setEmailBodyTemplate] = useState<ShareBriefTemplate>('meetingBrief');
  const [exportPackaging, setExportPackaging] = useState<BatchExportPackaging>('single');

  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);
  useEffect(() => {
    if (visible) {
      setEmailBodyTemplate((prev) =>
        BATCH_EMAIL_FORMAT_TEMPLATES.includes(prev) ? prev : 'meetingBrief',
      );
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }

    ref.current?.dismiss();
    setEmailVisible(false);
    setEmail('');
    setEmailBodyTemplate('meetingBrief');
    setExportPackaging('single');
    return undefined;
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

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
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 20),
          gap: 10,
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
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

        {renderOption({
          icon: <UsersRound size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.speakerTurnsBrief'),
          description: t('share.speakerTurnsBriefDescription'),
          accessibilityLabel: t('share.speakerTurnsBrief'),
          onPress: handleExportSpeakerTurns,
        })}

        {renderOption({
          icon: <Mail size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.emailNote'),
          description: t('batch.emailBatchDescription'),
          accessibilityLabel: t('share.emailNote'),
          onPress: handleOpenEmail,
        })}

        {emailVisible && (
          <View
            className="gap-3 rounded-xl border p-3"
            style={{
              borderColor: color.border.default,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text style={{ fontSize: 13, color: color.text.muted }}>
              {t('batch.emailBodyFormatHint')}
            </Text>
            <Text style={{ fontSize: 12, color: color.text.muted, lineHeight: 17 }}>
              {exportPackaging === 'zip'
                ? t('batch.emailZipLimitReminder')
                : t('batch.emailLimitReminder')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
              {BATCH_EMAIL_FORMAT_TEMPLATES.map((tpl) => (
                <EmailBodyFormatChip
                  key={tpl}
                  template={tpl}
                  label={emailTemplateChipLabel(tpl, t)}
                  selectedTemplate={emailBodyTemplate}
                  onSelect={setEmailBodyTemplate}
                  color={color}
                />
              ))}
            </View>
            <BottomSheetTextInput
              className="rounded-xl border px-3.5 py-3 text-[16px]"
              style={{
                borderColor: color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.primary,
              }}
              value={email}
              onChangeText={setEmail}
              placeholder={t('share.emailPlaceholder')}
              placeholderTextColor={color.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleSendEmail}
              accessibilityLabel={t('share.emailPlaceholder')}
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCancelEmail}
                activeOpacity={0.75}
                disabled={isSendingEmail}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                className="min-w-0 flex-1 items-center rounded-xl px-3 py-3"
                style={{ backgroundColor: color.background.secondary }}
              >
                <Text className="font-semibold" style={{ color: color.text.primary }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendEmail}
                activeOpacity={0.75}
                disabled={!emailValid || isSendingEmail}
                accessibilityRole="button"
                accessibilityLabel={t('share.sendEmail')}
                className="min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3"
                style={{
                  backgroundColor: color.accent.primary,
                  opacity: emailValid && !isSendingEmail ? 1 : 0.5,
                }}
              >
                {isSendingEmail && <ActivityIndicator size="small" color="#fff" />}
                <Text className="font-semibold text-white">{t('share.sendEmail')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
