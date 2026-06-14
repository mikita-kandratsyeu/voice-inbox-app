import type { Colors } from '@/shared/config';
import { FILTER_CHIP_MIN_HEIGHT } from '@/shared/ui/filterChipMetrics';

export const GRAPH_EXPORT_CONTROL_HEIGHT = FILTER_CHIP_MIN_HEIGHT;

export type GraphExportControlTone = {
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
  chevronColor: string;
  opacity: number;
};

export function getGraphExportControlTone(
  color: Colors,
  options: { isActive: boolean; disabled?: boolean },
): GraphExportControlTone {
  const { isActive, disabled = false } = options;

  return {
    backgroundColor: isActive ? color.background.card : color.background.tertiary,
    borderColor: color.border.default,
    iconColor: isActive ? color.accent.primary : color.text.muted,
    textColor: isActive ? color.text.primary : color.text.muted,
    chevronColor: isActive ? color.text.secondary : color.text.muted,
    opacity: disabled ? 0.45 : 1,
  };
}
