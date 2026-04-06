import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
//@ts-ignore
import { useIsKeyboardShown } from '@react-navigation/bottom-tabs/lib/module/utils/useIsKeyboardShown.js';
//@ts-ignore
import { BottomTabItem } from '@react-navigation/bottom-tabs/lib/module/views/BottomTabItem.js';
import {
  getDefaultSidebarWidth,
  getLabel,
  MissingIcon,
  useFrameSize,
} from '@react-navigation/elements';
import {
  CommonActions,
  NavigationProvider,
  type ParamListBase,
  type TabNavigationState,
  useLinkBuilder,
  useLocale,
  useTheme,
} from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { type EdgeInsets } from 'react-native-safe-area-context';

import { IS_IOS, useIsTablet } from '@/shared/lib';
import { IS_WEB } from '@/shared/lib/platform';

type Props = Record<string, any> & {
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
};

const TABBAR_HEIGHT_UIKIT = 49;
const TABBAR_HEIGHT_UIKIT_COMPACT = 32;
const SPACING_UIKIT = 15;
const SPACING_MATERIAL = 12;
const DEFAULT_MAX_TAB_ITEM_WIDTH = 125;

const useNativeDriver = !IS_WEB;

type Options = {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, any>;
  dimensions: { height: number; width: number };
};

const shouldUseHorizontalLabels = ({ state, descriptors, dimensions }: Options) => {
  const { tabBarLabelPosition } = descriptors[state.routes[state.index].key].options;

  if (tabBarLabelPosition) {
    switch (tabBarLabelPosition) {
      case 'beside-icon':
        return true;
      case 'below-icon':
        return false;
    }
  }

  if (dimensions.width >= 768) {
    const maxTabWidth = state.routes.reduce((acc, route) => {
      const { tabBarItemStyle } = descriptors[route.key].options;
      const flattenedStyle = StyleSheet.flatten(tabBarItemStyle);

      if (flattenedStyle) {
        if (typeof flattenedStyle.width === 'number') {
          return acc + flattenedStyle.width;
        } else if (typeof flattenedStyle.maxWidth === 'number') {
          return acc + flattenedStyle.maxWidth;
        }
      }

      return acc + DEFAULT_MAX_TAB_ITEM_WIDTH;
    }, 0);

    return maxTabWidth <= dimensions.width;
  } else {
    return dimensions.width > dimensions.height;
  }
};

const isCompact = ({
  descriptors,
  dimensions,
  isTablet,
  state,
}: Options & { isTablet: boolean }): boolean => {
  const { tabBarPosition, tabBarVariant } = descriptors[state.routes[state.index].key].options;

  if (tabBarPosition === 'left' || tabBarPosition === 'right' || tabBarVariant === 'material') {
    return false;
  }

  const isLandscape = dimensions.width > dimensions.height;
  const horizontalLabels = shouldUseHorizontalLabels({
    state,
    descriptors,
    dimensions,
  });

  if (IS_IOS && !isTablet && isLandscape && horizontalLabels) {
    return true;
  }

  return false;
};

const getTabBarHeight = ({
  descriptors,
  dimensions,
  insets,
  isTablet,
  state,
  style,
}: Options & {
  insets: EdgeInsets;
  style: Animated.WithAnimatedValue<StyleProp<ViewStyle>> | undefined;
  isTablet: boolean;
}) => {
  const { tabBarPosition } = descriptors[state.routes[state.index].key].options;

  const flattenedStyle = StyleSheet.flatten(style);
  const customHeight =
    flattenedStyle && 'height' in flattenedStyle ? flattenedStyle.height : undefined;

  if (typeof customHeight === 'number') {
    return customHeight;
  }

  const inset = insets[tabBarPosition === 'top' ? 'top' : 'bottom'];

  if (isCompact({ state, descriptors, dimensions, isTablet })) {
    return TABBAR_HEIGHT_UIKIT_COMPACT + inset;
  }

  return TABBAR_HEIGHT_UIKIT + inset;
};

export function EvenlySpacedBottomTabBar({ state, navigation, descriptors, insets, style }: Props) {
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { buildHref } = useLinkBuilder();
  const isTablet = useIsTablet();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  const {
    tabBarPosition = 'bottom',
    tabBarShowLabel,
    tabBarLabelPosition,
    tabBarHideOnKeyboard = false,
    tabBarVisibilityAnimationConfig,
    tabBarVariant = 'uikit',
    tabBarStyle,
    tabBarBackground,
    tabBarActiveTintColor,
    tabBarInactiveTintColor,
    tabBarActiveBackgroundColor,
    tabBarInactiveBackgroundColor,
  } = focusedOptions;

  if (tabBarVariant === 'material' && tabBarPosition !== 'left' && tabBarPosition !== 'right') {
    throw new Error(
      "The 'material' variant for tab bar is only supported when 'tabBarPosition' is set to 'left' or 'right'.",
    );
  }

  if (
    tabBarLabelPosition === 'below-icon' &&
    tabBarVariant === 'uikit' &&
    (tabBarPosition === 'left' || tabBarPosition === 'right')
  ) {
    throw new Error(
      "The 'below-icon' label position for tab bar is only supported when 'tabBarPosition' is set to 'top' or 'bottom' when using the 'uikit' variant.",
    );
  }

  const isKeyboardShown = useIsKeyboardShown();

  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const shouldShowTabBar = !(tabBarHideOnKeyboard && isKeyboardShown);
  const visibilityAnimationConfigRef = useRef(tabBarVisibilityAnimationConfig);

  useEffect(() => {
    visibilityAnimationConfigRef.current = tabBarVisibilityAnimationConfig;
  });

  const [isTabBarHidden, setIsTabBarHidden] = useState(!shouldShowTabBar);

  const [visible] = useState(() => new Animated.Value(shouldShowTabBar ? 1 : 0));

  useEffect(() => {
    const visibilityAnimationConfig = visibilityAnimationConfigRef.current;

    if (shouldShowTabBar) {
      const animation =
        visibilityAnimationConfig?.show?.animation === 'spring' ? Animated.spring : Animated.timing;

      animation(visible, {
        toValue: 1,
        useNativeDriver,
        duration: 250,
        ...visibilityAnimationConfig?.show?.config,
      }).start(({ finished }) => {
        if (finished) {
          setIsTabBarHidden(false);
        }
      });
    } else {
      setIsTabBarHidden(true);

      const animation =
        visibilityAnimationConfig?.hide?.animation === 'spring' ? Animated.spring : Animated.timing;

      animation(visible, {
        toValue: 0,
        useNativeDriver,
        duration: 200,
        ...visibilityAnimationConfig?.hide?.config,
      }).start();
    }

    return () => visible.stopAnimation();
  }, [visible, shouldShowTabBar]);

  const [layout, setLayout] = useState({
    height: 0,
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;

    onHeightChange?.(height);

    setLayout((prev) => {
      if (height === prev.height) {
        return prev;
      } else {
        return { height };
      }
    });
  };

  const { routes } = state;

  const tabBarHeight = useFrameSize((dimensions) =>
    getTabBarHeight({
      descriptors,
      dimensions,
      insets,
      isTablet,
      state,
      style: [tabBarStyle, style],
    }),
  );

  const hasHorizontalLabels = useFrameSize((dimensions) =>
    shouldUseHorizontalLabels({
      state,
      descriptors,
      dimensions,
    }),
  );

  const compact = useFrameSize((dimensions) =>
    isCompact({ state, descriptors, dimensions, isTablet }),
  );
  const sidebar = tabBarPosition === 'left' || tabBarPosition === 'right';
  const spacing = tabBarVariant === 'material' ? SPACING_MATERIAL : SPACING_UIKIT;

  const minSidebarWidth = useFrameSize((size) =>
    sidebar && hasHorizontalLabels ? getDefaultSidebarWidth(size) : 0,
  );

  const tabBarBackgroundElement = tabBarBackground?.();
  const flatTabBarStyle = StyleSheet.flatten(tabBarStyle) as { width?: number } | undefined;
  const isFixedWidthTabBar = typeof flatTabBarStyle?.width === 'number';

  return (
    <Animated.View
      style={[
        tabBarPosition === 'left'
          ? styles.start
          : tabBarPosition === 'right'
            ? styles.end
            : isFixedWidthTabBar
              ? styles.bottomAnchored
              : styles.bottom,
        (
          IS_WEB
            ? tabBarPosition === 'right'
            : (direction === 'rtl' && tabBarPosition === 'left') ||
              (direction !== 'rtl' && tabBarPosition === 'right')
        )
          ? { borderLeftWidth: StyleSheet.hairlineWidth }
          : (
                IS_WEB
                  ? tabBarPosition === 'left'
                  : (direction === 'rtl' && tabBarPosition === 'right') ||
                    (direction !== 'rtl' && tabBarPosition === 'left')
              )
            ? { borderRightWidth: StyleSheet.hairlineWidth }
            : tabBarPosition === 'top'
              ? { borderBottomWidth: StyleSheet.hairlineWidth }
              : { borderTopWidth: StyleSheet.hairlineWidth },
        {
          backgroundColor: tabBarBackgroundElement != null ? 'transparent' : colors.card,
          borderColor: colors.border,
        },
        sidebar
          ? {
              paddingTop: (hasHorizontalLabels ? spacing : spacing / 2) + insets.top,
              paddingBottom: (hasHorizontalLabels ? spacing : spacing / 2) + insets.bottom,
              paddingStart: spacing + (tabBarPosition === 'left' ? insets.left : 0),
              paddingEnd: spacing + (tabBarPosition === 'right' ? insets.right : 0),
              minWidth: minSidebarWidth,
            }
          : [
              {
                transform: [
                  {
                    translateY: visible.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        layout.height +
                          insets[tabBarPosition === 'top' ? 'top' : 'bottom'] +
                          StyleSheet.hairlineWidth,
                        0,
                      ],
                    }),
                  },
                ],
                position: isTabBarHidden ? 'absolute' : undefined,
              },
              {
                height: tabBarHeight,
                paddingBottom: tabBarPosition === 'bottom' ? insets.bottom : 0,
                paddingTop: tabBarPosition === 'top' ? insets.top : 0,
                paddingHorizontal: isFixedWidthTabBar ? 0 : Math.max(insets.left, insets.right),
              },
            ],
        tabBarStyle,
      ]}
      pointerEvents={isTabBarHidden ? 'none' : 'auto'}
      onLayout={sidebar ? undefined : handleLayout}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {tabBarBackgroundElement}
      </View>
      <View
        role="tablist"
        style={sidebar ? styles.sideContent : [styles.bottomContent, styles.bottomContentSpaceEven]}
      >
        {routes.map((route: any, index: number) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate(route),
                target: state.key,
              });
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const label =
            typeof options.tabBarLabel === 'function'
              ? options.tabBarLabel
              : getLabel({ label: options.tabBarLabel, title: options.title }, route.name);

          const accessibilityLabel =
            options.tabBarAccessibilityLabel !== undefined
              ? options.tabBarAccessibilityLabel
              : typeof label === 'string' && IS_IOS
                ? `${label}, tab, ${index + 1} of ${routes.length}`
                : undefined;

          return (
            <NavigationProvider
              key={route.key}
              route={route}
              navigation={descriptors[route.key].navigation}
            >
              <BottomTabItem
                href={buildHref(route.name, route.params)}
                route={route}
                descriptor={descriptors[route.key]}
                focused={focused}
                horizontal={hasHorizontalLabels}
                compact={compact}
                sidebar={sidebar}
                variant={tabBarVariant}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={accessibilityLabel}
                testID={options.tabBarButtonTestID}
                allowFontScaling={options.tabBarAllowFontScaling}
                activeTintColor={tabBarActiveTintColor}
                inactiveTintColor={tabBarInactiveTintColor}
                activeBackgroundColor={tabBarActiveBackgroundColor}
                inactiveBackgroundColor={tabBarInactiveBackgroundColor}
                button={options.tabBarButton}
                icon={
                  options.tabBarIcon ??
                  (({ color, size }: Record<string, any>) => (
                    <MissingIcon color={color} size={size} />
                  ))
                }
                badge={options.tabBarBadge}
                badgeStyle={options.tabBarBadgeStyle}
                label={label}
                showLabel={tabBarShowLabel}
                labelStyle={options.tabBarLabelStyle}
                iconStyle={options.tabBarIconStyle}
                style={[
                  sidebar
                    ? {
                        marginVertical: hasHorizontalLabels
                          ? tabBarVariant === 'material'
                            ? 0
                            : 1
                          : spacing / 2,
                      }
                    : styles.evenlySpacedTabItem,
                  options.tabBarItemStyle,
                ]}
              />
            </NavigationProvider>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  start: {
    top: 0,
    bottom: 0,
    start: 0,
  },
  end: {
    top: 0,
    bottom: 0,
    end: 0,
  },
  bottom: {
    start: 0,
    end: 0,
    bottom: 0,
    elevation: 8,
  },
  bottomAnchored: {
    bottom: 0,
    elevation: 8,
  },
  bottomContent: {
    flex: 1,
    flexDirection: 'row',
  },
  bottomContentSpaceEven: {
    justifyContent: 'space-evenly',
  },
  sideContent: {
    flex: 1,
    flexDirection: 'column',
  },
  evenlySpacedTabItem: {
    flexGrow: 0,
    flexShrink: 0,
  },
});
