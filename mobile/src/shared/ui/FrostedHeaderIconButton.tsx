import { useColors } from '@/shared/config';

import {
  FROSTED_HEADER_ICON_SIZE,
  FrostedChromeSurface,
  type FrostedChromeVariant,
} from './FrostedChromeSurface';
import { HeaderIconButton, type HeaderIconButtonProps } from './HeaderIconButton';

export type FrostedHeaderIconButtonProps = HeaderIconButtonProps & {
  chromeVariant?: FrostedChromeVariant;
};

/** Single circular header icon in frosted chrome (back, save, close). */
export function FrostedHeaderIconButton({
  color: colorProp,
  chromeVariant = 'default',
  ...props
}: FrostedHeaderIconButtonProps) {
  const fallbackColor = useColors();
  const color = colorProp ?? fallbackColor;

  return (
    <FrostedChromeSurface
      color={color}
      fixedSize={FROSTED_HEADER_ICON_SIZE}
      shadow="subtle"
      variant={chromeVariant}
    >
      <HeaderIconButton inFrostedGroup color={color} {...props} />
    </FrostedChromeSurface>
  );
}
