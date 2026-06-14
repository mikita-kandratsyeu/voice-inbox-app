import { crash, getCrashlytics } from '@react-native-firebase/crashlytics';
import { AlertTriangle, HardDrive, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../../lib/settingsIconColor';

type Props = {
  color: Colors;
  onClearMmkv: () => void;
  isClearingMmkv?: boolean;
  onHardReset: () => void;
  isHardResetting?: boolean;
  showCrashlyticsButton?: boolean;
};

export const SettingsDebugSection = ({
  color,
  onClearMmkv,
  isClearingMmkv = false,
  onHardReset,
  isHardResetting = false,
  showCrashlyticsButton = false,
}: Props) => {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.debugScreen.title')}>
      {showCrashlyticsButton && (
        <SettingsRow
          label="Test Crashlytics (native crash)"
          leftIcon={
            <AlertTriangle
              size={20}
              color={getSettingsIconColor(color, 'alertTriangle')}
              strokeWidth={1.8}
            />
          }
          onPress={() => crash(getCrashlytics())}
          showChevron={false}
          isFirst
          isLast={false}
          dangerous
        />
      )}
      <SettingsRow
        label={
          isClearingMmkv
            ? t('settings.debugScreen.clearMmkvInProgress')
            : t('settings.debugScreen.clearMmkv')
        }
        subtitle={t('settings.debugScreen.clearMmkvSubtitle')}
        leftIcon={
          <HardDrive size={20} color={getSettingsIconColor(color, 'hardDrive')} strokeWidth={1.8} />
        }
        loading={isClearingMmkv}
        onPress={onClearMmkv}
        showChevron={false}
        isFirst={!showCrashlyticsButton}
        isLast={false}
        dangerous
      />
      <SettingsRow
        label={isHardResetting ? 'Hard reset in progress...' : 'Hard reset (wipe all app data)'}
        leftIcon={
          <RotateCcw size={20} color={getSettingsIconColor(color, 'rotateCcw')} strokeWidth={1.8} />
        }
        loading={isHardResetting}
        onPress={onHardReset}
        showChevron={false}
        isFirst={false}
        isLast
        dangerous
      />
    </SettingsSection>
  );
};
