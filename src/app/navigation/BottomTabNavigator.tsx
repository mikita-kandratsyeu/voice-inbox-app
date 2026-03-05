import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Inbox, Mic, Settings } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InboxScreen } from '@/screens/inbox';
import { SettingsScreen } from '@/screens/settings';
import { colors, getColors } from '@/shared/config';

import type { RootStackParamList } from './RootNavigator';

export type BottomTabParamList = {
  Inbox: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_ICON_SIZE = 24;
const FAB_SIZE = 56;

const AnimatedTabButton = ({ children, onPress, onLongPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.82,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const tabIconStyle = {
    transform: [{ scale }],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabButton}
    >
      <Animated.View style={tabIconStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

const RecordFAB = ({ bottomInset, iconColor }: { bottomInset: number; iconColor: string }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  const handlePress = () => {
    navigation.navigate('RecordModal');
  };

  const fabContainerStyle = [styles.fab, { bottom: bottomInset + 16, transform: [{ scale }] }];

  return (
    <Animated.View style={fabContainerStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.fabInner}
      >
        <Mic size={26} color={iconColor} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const tabBarHeight = 60 + insets.bottom;

  const color = getColors(isDark ? 'dark' : 'light');
  const tabBg = color.background.primary;
  const tabBorder = color.border.default;
  const tabActive = color.accent.primary;
  const tabInactive = color.tab.inactive;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tabActive,
          tabBarInactiveTintColor: tabInactive,
          tabBarStyle: {
            backgroundColor: tabBg,
            borderTopColor: tabBorder,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
          lazy: true,
        }}
      >
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            tabBarLabel: 'Входящие',
            tabBarIcon: ({ color }) => (
              <Inbox size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Настройки',
            tabBarIcon: ({ color }) => (
              <Settings size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />
            ),
          }}
        />
      </Tab.Navigator>

      <RecordFAB bottomInset={tabBarHeight} iconColor={color.icon.onAccent} />
    </View>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    marginVertical: 0,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.light.accent.primary,
    shadowColor: colors.light.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
