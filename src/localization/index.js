import en from './en';
import ur from './ur';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰' },
];

export const dictionaries = { en, ur };

export function getDictionary(lang) {
  return dictionaries[lang] ?? dictionaries.en;
}

export const isRTL = (lang) => lang === 'ur' || lang === 'ar';