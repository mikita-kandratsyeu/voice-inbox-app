import { Mic, Server, Shield } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { isPrivateCustomServerMode, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';

type PrivateModeBadgeProps = {
  color: Colors;
  compact?: boolean;
  text?: string;
};

type BadgeChromeProps = {
  compact?: boolean;
  accentColor: string;
  icon: React.ReactNode;
  text: string;
};

function BadgeChrome({ compact = false, accentColor, icon, text }: BadgeChromeProps) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        gap: compact ? 4 : 6,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 3 : 4,
        backgroundColor: `${accentColor}22`,
        borderWidth: 1,
        borderColor: `${accentColor}66`,
      }}
    >
      {icon}
      <Text
        className={compact ? 'text-[11px] font-semibold' : 'text-xs font-semibold'}
        style={{ color: accentColor }}
      >
        {text}
      </Text>
    </View>
  );
}

/** On-device private AI (Shield + Private). */
export const PrivateModeBadge = ({ color, compact = false, text }: PrivateModeBadgeProps) => {
  const { t } = useTranslation();

  const iconProps = {
    size: compact ? 11 : 12,
    color: color.accent.primary,
    strokeWidth: compact ? 2.2 : 2,
  };

  const label = text ?? t('settings.planStatus.privateBadge');
  const icon = text ? <Mic {...iconProps} /> : <Shield {...iconProps} />;

  return (
    <BadgeChrome compact={compact} accentColor={color.accent.primary} icon={icon} text={label} />
  );
};

function CustomServerModeBadge({ color, compact = false }: PrivateModeBadgeProps) {
  const { t } = useTranslation();
  const accentColor = color.accent.primary;

  const iconProps = {
    size: compact ? 11 : 12,
    color: accentColor,
    strokeWidth: compact ? 2.2 : 2,
  };

  return (
    <BadgeChrome
      compact={compact}
      accentColor={accentColor}
      icon={<Server {...iconProps} />}
      text={t('aiSettings.privateProvider.custom_openai')}
    />
  );
}

/** Header chip for private execution mode (on-device vs custom server). */
export function PrivateExecutionBadge({ color, compact = false }: PrivateModeBadgeProps) {
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);

  if (aiExecutionMode !== 'private_experimental') {
    return null;
  }

  if (isPrivateCustomServerMode(aiExecutionMode, privateAiProvider)) {
    return <CustomServerModeBadge color={color} compact={compact} />;
  }

  return <PrivateModeBadge color={color} compact={compact} />;
}
