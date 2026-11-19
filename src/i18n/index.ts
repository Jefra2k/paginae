import i18n, { type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./de.json";
import fr from "./fr.json";

export type Language = "de" | "fr";

function detectLanguage(): Language {
  return navigator.language.startsWith("fr") ? "fr" : "de";
}

/** Initialises i18next once (synchronously, catalogs are bundled); later calls only switch the language. */
export function initI18n(language: Language = detectLanguage()): I18n {
  if (i18n.isInitialized) {
    void i18n.changeLanguage(language);
    return i18n;
  }
  void i18n.use(initReactI18next).init({
    resources: { de: { translation: de }, fr: { translation: fr } },
    lng: language,
    fallbackLng: "de",
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return i18n;
}
