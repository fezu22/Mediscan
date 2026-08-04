import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, History, User } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

import HomeScreen from '@/screens/Home/HomeScreen';
import HistoryScreen from '@/screens/History/HistoryScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: t.tabs.history,
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
