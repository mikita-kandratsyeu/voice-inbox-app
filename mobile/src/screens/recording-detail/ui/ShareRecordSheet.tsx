import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { FileText, ListChecks, Mail, Music, UsersRound } from 'lucide-react-native';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShareBriefTemplate } from '@/features/share-record';
import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

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
    return undefined;
  }, [visible]);

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
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              {(
                [
                  { tpl: 'meetingBrief' as const, label: t('share.meetingBrief') },
                  { tpl: 'meetingSpeakerTurns' as const, label: t('share.speakerTurnsBrief') },
                ] as const
              ).map(({ tpl, label }) => {
                const selected = emailSendTemplate === tpl;
                return (
                  <TouchableOpacity
                    key={tpl}
                    onPress={() => setEmailSendTemplate(tpl)}
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
                      backgroundColor: selected
                        ? color.background.secondary
                        : color.background.primary,
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
              })}
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

        {renderOption({
          icon: <Music size={20} color={color.text.primary} strokeWidth={2.1} />,
          title: t('share.shareAudio'),
          description: hasAudio ? undefined : t('share.noAudio'),
          accessibilityLabel: t('share.shareAudio'),
          disabled: !hasAudio,
          onPress: handleShareAudio,
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
