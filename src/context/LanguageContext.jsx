import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDictionary, isRTL } from '@/localization';

const LANGUAGE_STORAGE_KEY = '@medscan/language';

const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'ur') {
          setLanguageState(stored);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    // Note: a full RTL flip via I18nManager.forceRTL requires an app reload
    // to take visual effect on native layout. We still set it so the next
    // cold start renders correctly. In-session, screens should also read
    // `isRTL(language)` directly to mirror text alignment/flex-direction
    // without requiring a restart.
    const shouldBeRTL = isRTL(lang);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const value = useMemo(
    () => ({ language, t: getDictionary(language), isReady, setLanguage }),
    [language, isReady],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
