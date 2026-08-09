import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDictionary, LANGUAGES, isRTL } from '@/localization';

const LANGUAGE_STORAGE_KEY = '@medscan/language';

const globalKey = '__MEDSCAN_LANGUAGE_CONTEXT__';
const LanguageContext =
  globalThis[globalKey] || createContext(undefined);
if (!globalThis[globalKey]) {
  globalThis[globalKey] = LanguageContext;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && LANGUAGES.some((l) => l.code === stored)) {
          setLanguageState(stored);
          const rtl = isRTL(stored);
          if (I18nManager.isRTL !== rtl) {
            I18nManager.allowRTL(rtl);
            I18nManager.forceRTL(rtl);
          }
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (lang) => {
    const rtl = isRTL(lang);
    const rtlChanged = I18nManager.isRTL !== rtl;

    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    if (rtlChanged) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      // RN needs reload for full RTL layout; strings update immediately via state
    }
  };

  const value = useMemo(
    () => ({
      language,
      t: getDictionary(language),
      isReady,
      setLanguage,
      languages: LANGUAGES,
      isRTL: isRTL(language),
    }),
    [language, isReady],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
