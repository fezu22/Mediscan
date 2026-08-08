import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDictionary, LANGUAGES } from '@/localization';

const LANGUAGE_STORAGE_KEY = '@medscan/language';

const LanguageContext = createContext(undefined);

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
  };

  const value = useMemo(
    () => ({
      language,
      t: getDictionary(language),
      isReady,
      setLanguage,
      languages: LANGUAGES,
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