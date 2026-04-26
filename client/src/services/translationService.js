import { supabase } from '@/lib/supabase';

/**
 * TranslationService
 * Interfaces with the backend proxy to provide Google Cloud Translation.
 * Using a backend proxy avoids 401 errors from the client-side.
 */
export const translationService = {
    /**
     * Translates text using the backend proxy endpoint.
     * 
     * @param {string} text - The text to translate.
     * @param {string} targetLang - The target language code (e.g., 'hi' for Hindi).
     * @returns {Promise<string>} The translated text.
     */
    async translateText(text, targetLang = 'hi') {
        if (!text || text.trim() === '') return '';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ text, targetLang })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Proxy translation failed");
            }

            const data = await response.json();
            return data.translatedText || text;
        } catch (error) {
            console.error("Translation request failed:", error);
            // Fallback to original text if translation fails
            return text;
        }
    }
};
