import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '@/screens/Splash/SplashScreen';
import LoginScreen from '@/screens/Auth/LoginScreen';
import CompleteProfileScreen from '@/screens/Auth/CompleteProfileScreen';
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
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Result" component={ResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}