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

/** iOS UIMenu inline section — `sectionTitle` becomes the native section header (iOS). */
export function inlineNativeMenuSection(
  sectionId: string,
  titleColor: ColorValue,
  subactions: NativeMenuAction[],
  sectionTitle = '',
): NativeMenuAction {
  return {
    id: sectionId,
    title: sectionTitle,
    displayInline: true,
    titleColor,
    subactions,
  };
}
