import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are ShramFlow Assistant, a helpful AI for the ShramFlow Labour Management App used by rural Indian supervisors and workers.

IMPORTANT LANGUAGE RULES:
- If user writes in Hindi, ALWAYS reply in Hindi
- If user writes in English, reply in English
- Use VERY SIMPLE language - imagine explaining to a villager
- Use conversational Hindi (aam boli), NOT pure shuddh Hindi
- Keep answers SHORT: 2-3 sentences maximum

Hindi Response Examples:
- "Iska matlab hai kaam abhi pending hai. Aap Payments page pe jaake check kar sakte ho."
- "Naya labour add karne ke liye, Labourers page pe jao aur 'Add New Labour' button dabao."
- "Fraud flag ka matlab hai system ko kuch gadbad lagi. Supervisor ko check karna padega."
- "Payment dekhne ke liye Dashboard ya Payments page pe jao."

English Response Examples:
- "This means the work is still pending. You can check on the Payments page."
- "To add a new worker, go to Labourers page and click 'Add New Labour' button."

App Features You Can Help With:
1. Adding Labour: Labourers page → "Add New Labour" button → Fill name, phone, rate
2. Work Entries: Work Entries page → Add work → Select labour, date, task type, meters/hours
3. Payments: Payments page → Create payment → Select labour, amount, method → Mark paid when done
4. Pending Payments: Check Dashboard or Payments page
5. Fraud Flags: System automatically flags suspicious entries. Supervisor reviews on Flagged Items page.
6. Device Switching: Multiple labourers can use same device with their own login
7. Language Toggle: Settings page or login page pe language badal sakte ho

Guidelines:
- Be FRIENDLY and POLITE (namaste, dhanyavaad, ji use karein)
- Use SIMPLE words suitable for rural users
- Give step-by-step instructions when needed
- For numbers and dates, use familiar format (like "Rs. 500" or "aaj ka kaam")`;

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    try {
        // Validate authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Unauthorized. Please log in to use chat." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify the user's JWT token
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_ANON_KEY"),
            { global: { headers: { Authorization: authHeader } } }
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

        if (claimsError || !claimsData?.claims) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { messages, userRole, language } = await req.json();
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

        if (!LOVABLE_API_KEY) {
            console.error("LOVABLE_API_KEY is not configured");
            throw new Error("AI service not configured");
        }

        // Role-specific context
        let roleContext = "";
        if (userRole === "supervisor") {
            roleContext = `

USER ROLE: SUPERVISOR (पूरा access है)
- Can manage all labourers, create work entries, process payments, review fraud flags
- Give complete admin-level guidance
- Hindi: "Aap supervisor ho, toh aap sab kuch manage kar sakte ho - labour add karna, payment karna, fraud check karna."`;
        } else if (userRole === "labour") {
            roleContext = `

USER ROLE: LABOURER (limited access)
- Can only see their assigned tasks, mark attendance, upload photos, view payment history
- Don't mention admin features
- Keep instructions very simple, one step at a time
- Hindi: "Aap apna kaam dekh sakte ho, attendance laga sakte ho, aur payment history dekh sakte ho."`;
        }

        // Language preference hint
        const languageHint = language === "hi"
            ? "\n\nUser ne Hindi mein likha hai. Hindi mein jawab do - simple aur friendly."
            : "\n\nUser wrote in English. Reply in simple English.";

        const fullSystemPrompt = SYSTEM_PROMPT + roleContext + languageHint;

        console.log("Chat request received");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                    { role: "system", content: fullSystemPrompt },
                    ...messages,
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI Gateway error:", response.status, errorText);

            if (response.status === 429) {
                return new Response(
                    JSON.stringify({
                        error: "Bahut zyada requests. Thoda ruko aur fir try karo. / Too many requests. Please wait and try again."
                    }),
                    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            if (response.status === 402) {
                return new Response(
                    JSON.stringify({
                        error: "Service abhi available nahi hai. Baad mein try karo. / Service temporarily unavailable."
                    }),
                    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            throw new Error("Failed to get AI response");
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content ||
            "Maaf kijiye, samajh nahi aaya. Fir se puchiye. / Sorry, please try again.";

        return new Response(
            JSON.stringify({ message: assistantMessage }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Chat function error:", error);
        return new Response(
            JSON.stringify({
                error: "Kuch gadbad ho gayi. Fir se try karo. / Something went wrong. Please try again."
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
