import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export const LanguageToggle = () => {
    const { lang, setLang } = useLanguage();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="gap-2 text-muted-foreground hover:text-foreground"
        >
            <Globe className="h-4 w-4" />
            <span className="font-medium">{lang === "en" ? "हिंदी" : "English"}</span>
        </Button>
    );
};
