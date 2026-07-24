import { Button, type ButtonProps } from './Button';

export type HeaderIconButtonProps = ButtonProps & {
  /** Transparent icon inside a {@link FrostedHeaderButtonGroup} or {@link FrostedChromeSurface}. */
  inFrostedGroup?: boolean;
};

/** Header controls: circular icon-only; labeled actions use a compact tertiary pill. */
export function HeaderIconButton({
  inFrostedGroup = false,
  containerStyle,
  ...props
}: HeaderIconButtonProps) {
  const isIconOnly = props.iconOnly ?? (Boolean(props.icon) && !props.label && !props.loading);

  if (isIconOnly && inFrostedGroup) {
    return (
      <Button
        {...props}
        variant="ghost"
        shape="circle"
        size="md"
        containerStyle={[{ backgroundColor: 'transparent' }, containerStyle]}
      />
    );
  }

  if (isIconOnly) {
    return <Button {...props} shape="circle" containerStyle={containerStyle} />;
  }

  return (
    <Button
      {...props}
      variant={props.variant ?? 'secondary'}
      size="header"
      activeOpacity={props.activeOpacity ?? 0.7}
    />
  );
}
