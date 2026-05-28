import React, { Children, Fragment, isValidElement } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { TABLET_SIDEBAR_COLLAPSED_STACK_GAP } from './tabletSidebarMetrics';

type CollapsedRailStackProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function flattenCollapsedRailChildren(children: React.ReactNode): React.ReactNode[] {
  const items: React.ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (child == null || child === false) return;

    if (isValidElement<{ children?: React.ReactNode }>(child) && child.type === Fragment) {
      items.push(...flattenCollapsedRailChildren(child.props.children));
      return;
    }

    items.push(child);
  });

  return items;
}

/** Even vertical rhythm for collapsed sidebar icon rows (margin-based, not flex `gap`). */
export function CollapsedRailStack({ children, style }: CollapsedRailStackProps) {
  const items = flattenCollapsedRailChildren(children);

  return (
    <View style={[{ alignItems: 'center', width: '100%' }, style]}>
      {items.map((child, index) => (
        <View
          key={isValidElement(child) && child.key != null ? String(child.key) : index}
          style={{
            marginBottom: index < items.length - 1 ? TABLET_SIDEBAR_COLLAPSED_STACK_GAP : 0,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
