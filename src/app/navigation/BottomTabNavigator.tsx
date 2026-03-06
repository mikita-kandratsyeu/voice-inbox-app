import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Inbox, Mic, Settings } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InboxScreen } from '@/screens/inbox';
import { SettingsScreen } from '@/screens/settings';
import { getColors } from '@/shared/config';

import type { RootStackParamList } from './RootNavigator';

export type BottomTabParamList = {
  Inbox: undefined;
  Record: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_ICON_SIZE = 24;

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

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="my-0 flex-1 items-center justify-center py-0"
    >
      <Animated.View className="items-center justify-center" style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const CenterRecordButton = ({
  iconColor,
  accentColor,
}: {
  iconColor: string;
  accentColor: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
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

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View
        className="mb-[30px] h-[60px] w-[60px] rounded-full"
        style={{
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
          transform: [{ scale }],
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="h-[60px] w-[60px] items-center justify-center rounded-full"
        >
          <Mic size={26} color={iconColor} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const EmptyScreen = () => <View className="flex-1" />;

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
    <View className="flex-1">
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
            tabBarIcon: ({ color: c }) => (
              <Inbox size={TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
            ),
          }}
        />
        <Tab.Screen
          name="Record"
          component={EmptyScreen}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('RecordModal' as never);
            },
          })}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: () => (
              <CenterRecordButton
                iconColor={color.icon.onAccent}
                accentColor={color.accent.primary}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Настройки',
            tabBarIcon: ({ color: c }) => (
              <Settings size={TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
