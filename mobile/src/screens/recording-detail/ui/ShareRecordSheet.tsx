import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { FileText, ListChecks, Mail, Music, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShareBriefTemplate } from '@/features/share-record';
import { useColors } from '@/shared/config';
import { IS_IOS, modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

/** Matches `SaveRecordModal` / `AddRecordingMarkSheet` bottom padding when the keyboard is open. */
const SAVE_SHEET_KEYBOARD_BOTTOM_PADDING = 24;

type ShareRecordSheetProps = {
  visible: boolean;
  hasAudio: boolean;
  isMeeting?: boolean;
  showSpeakerTurnsExport?: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onShareText: (template: ShareBriefTemplate) => void;
  onEmailRecord: (email: string, template: ShareBriefTemplate) => void;
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
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const [emailVisible, setEmailVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSendTemplate, setEmailSendTemplate] = useState<ShareBriefTemplate>('meetingBrief');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const trimmedEmail = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail), [trimmedEmail]);

  useEffect(() => {
    if (visible) {
      setEmailSendTemplate('meetingBrief');
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    ref.current?.dismiss();
    setEmailVisible(false);
    setEmail('');
    setKeyboardVisible(false);
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!emailVisible) {
      setKeyboardVisible(false);
      return undefined;
    }
    const showEvent = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [emailVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const handleShareNoteBrief = useCallback(() => {
    onClose();
    onShareText('noteBrief');
  }, [onClose, onShareText]);

  const handleShareMeetingBrief = useCallback(() => {
    onClose();
    onShareText('meetingBrief');
  }, [onClose, onShareText]);

  const handleShareSpeakerTurns = useCallback(() => {
    onClose();
    onShareText('meetingSpeakerTurns');
  }, [onClose, onShareText]);

  const handleShareAudio = useCallback(() => {
    onClose();
    onShareAudio();
  }, [onClose, onShareAudio]);

  const handleOpenEmail = useCallback(() => {
    setEmailVisible(true);
  }, []);

  const handleCancelEmail = useCallback(() => {
    Keyboard.dismiss();
    setKeyboardVisible(false);
    setEmailVisible(false);
    setEmail('');
  }, []);

  const handleSendEmail = useCallback(() => {
    if (!emailValid || isSendingEmail) return;
    onEmailRecord(trimmedEmail, emailSendTemplate);
  }, [emailSendTemplate, emailValid, isSendingEmail, onEmailRecord, trimmedEmail]);

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

  const emailFormatTemplates = useMemo(
    () =>
      [
        { tpl: 'meetingBrief' as const, label: t('share.meetingBrief') },
        { tpl: 'meetingSpeakerTurns' as const, label: t('share.speakerTurnsBrief') },
      ] as const,
    [t],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="none"
      enableBlurKeyboardOnGesture
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
      {emailVisible ? (
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: keyboardVisible
              ? SAVE_SHEET_KEYBOARD_BOTTOM_PADDING
              : Math.max(insets.bottom, 24),
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
            {t('share.shareAsTitle')}
          </Text>

          {renderOption({
            icon: <FileText size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.noteBrief'),
            description: t('share.noteBriefDescription'),
            accessibilityLabel: t('share.noteBrief'),
            onPress: handleShareNoteBrief,
          })}

          {renderOption({
            icon: <ListChecks size={20} color={color.text.primary} strokeWidth={2.1} />,
            title: t('share.meetingBrief'),
            description: t('share.meetingBriefDescription'),
            accessibilityLabel: t('share.meetingBrief'),
            onPress: handleShareMeetingBrief,
          })}

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
    </BottomSheetModal>
  );
};
