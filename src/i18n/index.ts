import i18n from 'i18next';
import { Platform, NativeModules } from 'react-native';
import { initReactI18next } from 'react-i18next';

import { be } from './be';
import { en } from './en';
import { ru } from './ru';

export type LanguageChoice = 'ru' | 'be' | 'en';

const SUPPORTED: LanguageChoice[] = ['ru', 'be', 'en'];

/**
 * Read the device language tag without any native localization library.
 * iOS: `AppleLocale` or first entry of `AppleLanguages`.
 * Android: device locale from `I18nManager`.
 */
const getDeviceLanguageTag = (): string | undefined => {
  if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings as
      | { AppleLocale?: string; AppleLanguages?: string[] }
      | undefined;
    const raw = settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
    return raw?.split(/[-_]/)[0]?.toLowerCase();
  }
  // Android
  const locale = (NativeModules.I18nManager as { localeIdentifier?: string } | undefined)
    ?.localeIdentifier;
  return locale?.split(/[-_]/)[0]?.toLowerCase();
};

/**
 * Maps the device locale to the closest supported language.
 * `be` / `ru` → exact match; any other → `en`; fallback → `ru`.
 */
export const getSystemLanguage = (): LanguageChoice => {
  const tag = getDeviceLanguageTag();
  if (tag && SUPPORTED.includes(tag as LanguageChoice)) {
    return tag as LanguageChoice;
  }
  return tag ? 'en' : 'ru';
};

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
