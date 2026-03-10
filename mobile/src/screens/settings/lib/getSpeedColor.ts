import type { Colors } from '@/shared/config';

export const getSpeedColor = (speed: string, color: Colors): string => {
  switch (speed) {
    case 'fast':
      return color.accent.success;
    case 'medium':
      return color.accent.unpin;
    case 'slow':
    case 'very_slow':
      return color.accent.delete;
    default:
      return color.text.secondary;
  }
};
