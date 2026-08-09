import en from './en';
import ur from './ur';
import ar from './ar';
import hi from './hi';
import ps from './ps';

export const dictionaries = {
  en,
  ur,
  ar,
  hi,
  ps,
};

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code);

export function getDictionary(code) {
  return dictionaries[code] || dictionaries.en;
}

export function isRTL(code) {
  return ['ur', 'ar', 'ps', 'fa', 'sd'].includes(code);
}

export default dictionaries;