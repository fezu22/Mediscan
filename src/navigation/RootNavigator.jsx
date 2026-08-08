import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import CompleteProfileScreen from '../screens/Auth/CompleteProfileScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

function isProfileComplete(user) {
  if (!user) return false;
  return !!(
    user.profileComplete ||
    user.user_metadata?.profileComplete ||
    user.user_metadata?.full_name
  );
}

export default function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  const profileDone = isProfileComplete(user);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !profileDone ? (
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
          />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}