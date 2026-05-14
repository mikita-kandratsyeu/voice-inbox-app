import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

/** Kept in sync with feature row line height in `SettingsPlanPaywallSheet` (`FeatureRow`). */
export const PLAN_PAYWALL_FEATURE_LINE_HEIGHT = 21;

/**
 * Pro label chip from the plan paywall pro feature list — reuse anywhere for identical styling.
 */
export function PlanPaywallProChip() {
  const { t } = useTranslation();
  const c = useColors();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="shrink-0 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: `${c.accent.primary}22`,
        marginTop: (PLAN_PAYWALL_FEATURE_LINE_HEIGHT - 20) / 2,
      }}
    >
      <Text className="text-[11px] font-semibold" style={{ color: c.accent.primary }}>
        {t('settings.planPaywall.proTitle').toUpperCase()}
      </Text>
    </View>
  );
}
