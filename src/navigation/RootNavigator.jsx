import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import CompleteProfileScreen from '../screens/Auth/CompleteProfileScreen';
import MainTabNavigator from './MainTabNavigator';
import ResultScreen from '../screens/Result/ResultScreen';

const Stack = createNativeStackNavigator();

function isProfileComplete(user) {
  if (!user) return false;
  const meta = user.user_metadata || {};
  return !!(
    meta.profileComplete === true ||
    (meta.full_name && meta.age && meta.phone)
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
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !profileDone ? (
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}