import { Crown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type ProCrownBadgeProps = {
  crownSize?: number;
};

/** Crown + Pro label — shared across settings rows/sections and sidebar nav. */
export function ProCrownBadge({ crownSize = 13 }: ProCrownBadgeProps) {
  const { t } = useTranslation();
  const color = useColors();

  return (
    <View className="flex-row items-center gap-1">
      <Crown size={crownSize} color={color.accent.primary} strokeWidth={2} />
      <Text className="text-xs font-semibold" style={{ color: color.accent.primary }}>
        {t('common.pro')}
      </Text>
    </View>
  );
}
