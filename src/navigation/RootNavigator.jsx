import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import CompleteProfileScreen from '../screens/Auth/CompleteProfileScreen';
import MainTabNavigator from './MainTabNavigator';
import ResultScreen from '../screens/Result/ResultScreen';

const Stack = createNativeStackNavigator();

const MIN_SPLASH_MS = 1500; // splash kam az kam itni der dikhe

function isProfileComplete(user) {
  if (!user) return false;
  return !!(
    user.profileComplete ||
    user.user_metadata?.profileComplete ||
    user.user_metadata?.full_name
  );
}

export default function RootNavigator() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { isReady: languageReady } = useLanguage();
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Jab tak auth check + language + min splash time complete na ho → Splash pe raho
  const stillLoading = authLoading || !languageReady || !minTimeDone;

  if (stillLoading) {
    return <SplashScreen />;
  }

  const profileDone = isProfileComplete(user);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
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