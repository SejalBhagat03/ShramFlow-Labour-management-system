import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log("Edge Function 'create-labour-user' invoked");
        console.log("SUPABASE_URL present:", !!Deno.env.get("SUPABASE_URL"));
        console.log("SERVICE_KEY present:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

        // Validate authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create client with user's auth to verify they are authenticated
        const supabaseUser = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_ANON_KEY"),
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify the caller's JWT and get their user ID
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

        if (userError || !user) {
            console.error("Auth error:", userError);
            return new Response(
                JSON.stringify({ error: "Invalid or expired session" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const callerId = user.id;

        // Use service role client to check if caller is a supervisor
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
        );

        // Verify caller is a supervisor
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", callerId)
            .single();

        if (roleError || roleData?.role !== "supervisor") {
            return new Response(
                JSON.stringify({ error: "Only supervisors can create labour accounts" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { email, password, fullName, phone } = await req.json();

        // Validate required fields
        if (!email || !password || !fullName) {
            console.error("Missing required fields:", { email: !!email, password: !!password, fullName: !!fullName });
            return new Response(
                JSON.stringify({ error: "Email, password, and full name are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.error("Invalid email format:", email);
            return new Response(
                JSON.stringify({ error: "Invalid email format" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate password length
        if (password.length < 6) {
            console.error("Password too short");
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create the new user with admin privileges
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm the email for labour users created by supervisor
            user_metadata: {
                full_name: fullName,
                phone: phone || null,
                role: 'labour' // hint to trigger
            },
        });

        if (createError) {
            console.error("Error creating user:", createError);
            // `createError` comes from Supabase client which types it as ApiError | null
            // but TS sometimes narrows it incorrectly; coerce to any for message access
            const msg = (createError as any)?.message || "Failed to create user in Auth";
            return new Response(
                JSON.stringify({ error: msg }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Assign 'labour' role to the new user (idempotent)
        const { error: roleInsertError } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: newUser.user.id, role: "labour" })
            .onConflict('user_id,role')
            .ignore();

        if (roleInsertError) {
            console.error("Error assigning role:", roleInsertError);
        }

        console.log("Labour user created successfully:", newUser.user.id);

        return new Response(
            JSON.stringify({
                userId: newUser.user.id,
                message: "Labour account created successfully"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err: unknown) {
        // catch variable typed unknown to satisfy TS strictness
        console.error("Create labour user error:", err);

        let errorMessage = "Failed to create labour account";
        if (err instanceof Error) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            errorMessage = err;
        } else if (typeof err === 'object' && err !== null && 'message' in err) {
            // fallback when error-like object contains message property
            errorMessage = (err as any).message;
        }

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
