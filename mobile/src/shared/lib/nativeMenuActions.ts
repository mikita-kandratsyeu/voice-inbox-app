import type { ColorValue } from 'react-native';

export type NativeMenuAction = {
  id: string;
  title: string;
  titleColor: ColorValue;
  image?: string;
  imageColor?: ColorValue;
  attributes?: { destructive?: boolean; disabled?: boolean };
  displayInline?: boolean;
  subactions?: NativeMenuAction[];
  state?: 'on' | 'off' | 'mixed';
};

/** iOS UIMenu inline section — renders a divider before `subactions`. */
export function inlineNativeMenuSection(
  sectionId: string,
  titleColor: ColorValue,
  subactions: NativeMenuAction[],
): NativeMenuAction {
  return {
    id: sectionId,
    title: '',
    displayInline: true,
    titleColor,
    subactions,
  };
}
