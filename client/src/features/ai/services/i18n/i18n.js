import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./locales/en/translation.json";
import hiTranslations from "./locales/hi/translation.json";

const resources = {
    en: {
        translation: enTranslations,
    },
    hi: {
        translation: hiTranslations,
    },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem("shramflow_language") || "en",
        fallbackLng: "en",
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

i18n.on("languageChanged", (lng) => {
    localStorage.setItem("shramflow_language", lng);
});

export default i18n;
