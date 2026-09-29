import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import km from "./km.json";

const STORAGE_KEY = "smartloan.locale";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    km: { translation: km },
  },
  lng: localStorage.getItem(STORAGE_KEY) || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLocale(locale: "en" | "km") {
  localStorage.setItem(STORAGE_KEY, locale);
  i18n.changeLanguage(locale);
}

export default i18n;
