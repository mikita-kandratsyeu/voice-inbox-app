import { X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { type Colors, useColors } from '@/shared/config';

import { Button } from './Button';

export type AiProcessingCancelButtonProps = {
  onPress: () => void;
  color?: Colors;
  /** Extra NativeWind classes on the button (e.g. `mt-1`, `mt-3`). */
  className?: string;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

/** Shared cancel control for AI / transcription processing UIs. */
export const AiProcessingCancelButton = ({
  onPress,
  color: colorProp,
  className,
  fullWidth = false,
  accessibilityLabel,
}: AiProcessingCancelButtonProps) => {
  const colors = useColors();
  const color = colorProp ?? colors;
  const { t } = useTranslation();
  const label = t('common.cancel');

  return (
    <Button
      variant="secondary"
      size="lg"
      icon={<X size={16} color={color.text.primary} strokeWidth={2.5} />}
      label={label}
      color={color}
      onPress={onPress}
      className={className}
      fullWidth={fullWidth}
      accessibilityLabel={accessibilityLabel ?? label}
    />
  );
};
