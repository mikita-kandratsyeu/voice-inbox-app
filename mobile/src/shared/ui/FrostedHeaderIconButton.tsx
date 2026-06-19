import { useColors } from '@/shared/config';

import {
  FROSTED_HEADER_ICON_SIZE,
  FrostedChromeSurface,
} from './FrostedChromeSurface';
import { HeaderIconButton, type HeaderIconButtonProps } from './HeaderIconButton';

/** Single circular header icon in frosted chrome (back, save, close). */
export function FrostedHeaderIconButton({
  color: colorProp,
  ...props
}: HeaderIconButtonProps) {
  const fallbackColor = useColors();
  const color = colorProp ?? fallbackColor;

  return (
    <FrostedChromeSurface color={color} fixedSize={FROSTED_HEADER_ICON_SIZE} shadow="subtle">
      <HeaderIconButton inFrostedGroup color={color} {...props} />
    </FrostedChromeSurface>
  );
}
