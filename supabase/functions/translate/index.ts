import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { text, target_lang } = await req.json();
        const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");

        if (!GOOGLE_CLOUD_API_KEY) {
            throw new Error("GOOGLE_CLOUD_API_KEY not configured");
        }

        const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_CLOUD_API_KEY}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: text,
                target: target_lang || "hi",
                format: "text"
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google Translation API error:", data);
            throw new Error(data.error?.message || "Translation failed");
        }

        const translatedText = data.data.translations[0].translatedText;

        return new Response(
            JSON.stringify({ translatedText }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Translation function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
