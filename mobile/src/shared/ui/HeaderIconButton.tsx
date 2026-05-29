import { Button, type ButtonProps } from './Button';

/** Header controls: circular icon-only; labeled actions use a compact tertiary pill. */
export function HeaderIconButton(props: ButtonProps) {
  const isIconOnly = props.iconOnly ?? (Boolean(props.icon) && !props.label && !props.loading);

  if (isIconOnly) {
    return <Button {...props} shape="circle" />;
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
