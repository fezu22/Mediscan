import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDictionary, isRTL, SUPPORTED_LANGUAGES } from '@/localization';

const LANGUAGE_STORAGE_KEY = '@medscan/language';
const LANGUAGE_CHOSEN_KEY = '@medscan/language_chosen';

const LanguageContext = createContext(undefined);

async function applyRTL(lang) {
  const shouldRTL = isRTL(lang);
  if (I18nManager.isRTL === shouldRTL) return false;
  I18nManager.allowRTL(shouldRTL);
  I18nManager.forceRTL(shouldRTL);
  return true;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [languageChosen, setLanguageChosen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stored, chosen] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
          AsyncStorage.getItem(LANGUAGE_CHOSEN_KEY),
        ]);

        const valid = SUPPORTED_LANGUAGES.some((l) => l.code === stored)
          ? stored
          : 'en';

        setLanguageState(valid);
        setLanguageChosen(chosen === '1');

        const shouldRTL = isRTL(valid);
        if (I18nManager.isRTL !== shouldRTL) {
          I18nManager.allowRTL(shouldRTL);
          I18nManager.forceRTL(shouldRTL);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (lang, { markChosen = true } = {}) => {
    const next = SUPPORTED_LANGUAGES.some((l) => l.code === lang) ? lang : 'en';
    setLanguageState(next);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);

    if (markChosen) {
      setLanguageChosen(true);
      await AsyncStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
    }

    const needsReload = await applyRTL(next);
    if (needsReload) {
      try {
        if (__DEV__ && DevSettings?.reload) {
          DevSettings.reload();
        }
      } catch (_) {}
    }
  };

  const value = useMemo(
    () => ({
      language,
      languageChosen,
      isReady,
      t: getDictionary(language),
      setLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      isRTLLayout: isRTL(language),
    }),
    [language, languageChosen, isReady],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}