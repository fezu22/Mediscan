import en from './en';
import ur from './ur';

export const dictionaries = { en, ur };

/** Returns the translation dictionary for a given language code, falling back to English. */
export function getDictionary(lang) {
  return dictionaries[lang] ?? dictionaries.en;
}

export const isRTL = (lang) => lang === 'ur';
