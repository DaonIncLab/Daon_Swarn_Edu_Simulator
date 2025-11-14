import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import koTranslation from './locales/ko.json'
import enTranslation from './locales/en.json'

const resources = {
  ko: {
    translation: koTranslation,
  },
  en: {
    translation: enTranslation,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    supportedLngs: ['ko', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app-language',
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
