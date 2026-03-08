import { supabase } from '@/lib/supabase';

/**
 * TranslationService
 * Interfaces with the Supabase Edge Function to provide Google Cloud Translation.
 */
export const translationService = {
    /**
     * Translates text using the 'translate' Edge Function.
     * 
     * @param {string} text - The text to translate.
     * @param {string} targetLang - The target language code (e.g., 'hi' for Hindi).
     * @returns {Promise<string>} The translated text.
     */
    async translateText(text, targetLang = 'hi') {
        if (!text || text.trim() === '') return '';

        try {
            const { data, error } = await supabase.functions.invoke('translate', {
                body: { text, target_lang: targetLang }
            });

            if (error) {
                console.error("Translation service error:", error);
                throw error;
            }

            return data.translatedText || text;
        } catch (error) {
            console.error("Translation request failed:", error);
            // Fallback to original text if translation fails
            return text;
        }
    }
};
