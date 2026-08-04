import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '@/screens/Splash/SplashScreen';
import LanguageSelectScreen from '@/screens/Onboarding/LanguageSelectScreen';
import AuthChoiceScreen from '@/screens/Auth/AuthChoiceScreen';
import CameraScreen from '@/screens/Camera/CameraScreen';
import ResultScreen from '@/screens/Result/ResultScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Result" component={ResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
