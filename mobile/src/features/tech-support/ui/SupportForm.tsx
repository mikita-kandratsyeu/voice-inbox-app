import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Text, TextInput, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { getInputFieldInputStyle } from '@/shared/ui';

export type SupportFormModel = ReturnType<typeof import('../model/useSupportForm').useSupportForm>;

type Props = {
  color: Colors;
} & SupportFormModel;

export function SupportForm({ color, ...form }: Props) {
  const { t } = useTranslation();
  const {
    email,
    setEmail,
    subject,
    setSubject,
    message,
    setMessage,
    appLogs,
    setAppLogs,
    attachLogs,
    setAttachLogs,
    attachLogsLoading,
    loading,
    error,
    successId,
    messageMin,
  } = form;

  const inputBase = [
    getInputFieldInputStyle(color, true),
    {
      color: color.text.primary,
      borderColor: color.border.default,
      backgroundColor: color.background.tertiary,
    },
  ];

  let feedback: ReactNode = null;

  if (error) {
    let errorText: string;
    if (error === 'message_too_short') {
      errorText = t('support.errorTooShort', { min: messageMin });
    } else {
      errorText = error;
    }
    feedback = (
      <Text className="text-[14px] leading-5" style={{ color: color.accent.delete }}>
        {errorText}
      </Text>
    );
  } else if (successId) {
    feedback = (
      <Text className="text-[14px] leading-5" style={{ color: color.accent.success }}>
        {t('support.success', { id: successId })}
      </Text>
    );
  }

  const feedbackSlotStyle =
    feedback == null
      ? { justifyContent: 'center' as const, marginTop: 18 }
      : { justifyContent: 'flex-start' as const };

  return (
    <View>
      <Text className="mb-3 text-[14px] leading-5" style={{ color: color.text.secondary }}>
        {t('support.intro')}
      </Text>

      <Text className="mb-1.5 text-[13px] font-medium" style={{ color: color.text.secondary }}>
        {t('support.emailLabel')}
      </Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className="mb-3 rounded-xl border-2 px-3 py-2.5 text-[16px]"
        editable={!loading}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder={t('support.emailPlaceholder')}
        placeholderTextColor={color.text.secondary}
        style={inputBase}
        value={email}
      />
      <Text className="mb-1.5 text-[13px] font-medium" style={{ color: color.text.secondary }}>
        {t('support.subjectLabel')}
      </Text>
      <TextInput
        className="mb-3 rounded-xl border-2 px-3 py-2.5 text-[16px]"
        style={inputBase}
        placeholder={t('support.subjectPlaceholder')}
        placeholderTextColor={color.text.secondary}
        value={subject}
        onChangeText={setSubject}
        editable={!loading}
      />
      <Text className="mb-1.5 text-[13px] font-medium" style={{ color: color.text.secondary }}>
        {t('support.messageLabel')}
      </Text>
      <TextInput
        className="mb-1 rounded-xl border-2 px-3 py-2.5 text-[16px]"
        style={[...inputBase, { minHeight: 140, textAlignVertical: 'top' }]}
        placeholder={t('support.messagePlaceholder')}
        placeholderTextColor={color.text.secondary}
        value={message}
        onChangeText={setMessage}
        multiline
        editable={!loading}
      />
      <Text className="mb-2 text-[12px]" style={{ color: color.text.secondary }}>
        {t('support.messageHint', { min: messageMin })}
      </Text>
      <View
        className="mb-4 rounded-2xl border px-4 py-4"
        style={{ borderColor: color.border.default, backgroundColor: color.background.tertiary }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[13px] font-medium" style={{ color: color.text.secondary }}>
              {t('support.attachLogsLabel')}
            </Text>
            <Text className="text-[12px] leading-5" style={{ color: color.text.secondary }}>
              {t('support.attachLogsDescription')}
            </Text>
          </View>
          <Switch
            trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
            thumbColor={attachLogs ? color.background.primary : color.background.secondary}
            value={attachLogs}
            onValueChange={setAttachLogs}
            disabled={loading}
          />
        </View>
        {attachLogsLoading ? (
          <Text className="mb-3 text-[12px]" style={{ color: color.text.secondary }}>
            {t('support.attachLogsLoading')}
          </Text>
        ) : null}
        <Text className="mb-1.5 text-[13px] font-medium" style={{ color: color.text.secondary }}>
          {t('support.logsLabel')}
        </Text>
        <Text className="mb-1 text-[12px] leading-4" style={{ color: color.text.secondary }}>
          {t('support.logsHint')}
        </Text>
        <TextInput
          className="rounded-xl border-2 px-3 py-2.5 text-[14px] font-mono"
          style={[...inputBase, { minHeight: 88, textAlignVertical: 'top' }]}
          placeholder={t('support.logsPlaceholder')}
          placeholderTextColor={color.text.secondary}
          value={appLogs}
          onChangeText={setAppLogs}
          multiline
          editable={!loading}
        />
        <View style={feedbackSlotStyle}>{feedback}</View>
      </View>
    </View>
  );
}
