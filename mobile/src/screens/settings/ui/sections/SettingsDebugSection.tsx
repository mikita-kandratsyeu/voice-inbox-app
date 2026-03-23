import { crash, getCrashlytics } from '@react-native-firebase/crashlytics';
import { AlertTriangle } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
};

export const SettingsDebugSection = ({ color }: Props) => (
  <SettingsSection title="Debug">
    <SettingsRow
      label="Test Crashlytics (native crash)"
      leftIcon={<AlertTriangle size={20} color={color.status.error.text} strokeWidth={1.8} />}
      onPress={() => crash(getCrashlytics())}
      showChevron={false}
      isFirst
      isLast
      dangerous
    />
  </SettingsSection>
);
