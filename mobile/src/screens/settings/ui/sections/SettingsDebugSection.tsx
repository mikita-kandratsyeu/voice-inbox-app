import { crash, getCrashlytics } from '@react-native-firebase/crashlytics';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  onHardReset: () => void;
  isHardResetting?: boolean;
  showCrashlyticsButton?: boolean;
};

export const SettingsDebugSection = ({
  color,
  onHardReset,
  isHardResetting = false,
  showCrashlyticsButton = false,
}: Props) => (
  <SettingsSection title="Debug">
    {showCrashlyticsButton && (
      <SettingsRow
        label="Test Crashlytics (native crash)"
        leftIcon={<AlertTriangle size={20} color={color.status.error.text} strokeWidth={1.8} />}
        onPress={() => crash(getCrashlytics())}
        showChevron={false}
        isFirst
        isLast={false}
        dangerous
      />
    )}
    <SettingsRow
      label={isHardResetting ? 'Hard reset in progress...' : 'Hard reset (wipe all app data)'}
      leftIcon={<RotateCcw size={20} color={color.status.error.text} strokeWidth={1.8} />}
      onPress={isHardResetting ? undefined : onHardReset}
      showChevron={false}
      isFirst={!showCrashlyticsButton}
      isLast
      dangerous
    />
  </SettingsSection>
);
