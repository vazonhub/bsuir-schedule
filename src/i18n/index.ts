import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { be } from './be';
import { en } from './en';
import { ru } from './ru';

export type LanguageChoice = 'ru' | 'be' | 'en';

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    be: { translation: be },
    en: { translation: en },
  },
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;
