import React, { createContext, useContext, useState } from "react";
import { translations } from "@/lib/i18n";

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState("en");

    const t = (key) => {
        return translations[lang][key] || key;
    };

    return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
