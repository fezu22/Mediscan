import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    // Note: No I18nManager.allowRTL / forceRTL here.
    // Layout always stays LTR (forced in index.js).
    // Only text/dictionary changes.
  };

  const value = useMemo(
    () => ({
      language,
      t: getDictionary(language),
      isReady,
      setLanguage,
      languages: LANGUAGES,
      isRTL: isRTL(language), // still available if needed for text direction
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