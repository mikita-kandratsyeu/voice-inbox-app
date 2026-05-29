import { Button, type ButtonProps } from './Button';

/** Icon control for screen / recording headers — circular, not 12px action buttons. */
export function HeaderIconButton(props: ButtonProps) {
  const isIconOnly = props.iconOnly ?? (Boolean(props.icon) && !props.label && !props.loading);

  return <Button {...props} shape={isIconOnly ? 'circle' : 'default'} />;
}
