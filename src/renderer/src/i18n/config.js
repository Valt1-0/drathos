import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en
  },
  fr: {
    translation: fr
  },
  de: {
    translation: de
  },
  es: {
    translation: es
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (_lng, _ns, key) => console.warn(`[i18n] Missing key: "${key}"`)
      : undefined,

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: true,
    }
  });

// Mirror the language into the electron store so the main process can
// localize native dialogs (quit confirmation, tray menu)
i18n.on('languageChanged', (lng) => window.store?.set('language', lng));
if (i18n.language) window.store?.set('language', i18n.language);

export default i18n;
