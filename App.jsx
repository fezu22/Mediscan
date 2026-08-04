import 'react-native-url-polyfill/auto';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
