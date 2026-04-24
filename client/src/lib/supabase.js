/**
 * @file client.js
 * @description Configures and exports the Supabase client for database and authentication services.
 * Uses environment variables for configuration.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Throttling and Circuit Breaker for network error management
let lastLoggedTime = 0;
const LOG_THROTTLE_MS = 60000; // 1 minute
const CIRCUIT_BREAKER_DURATION_MS = 0; // Disable - let all errors through for debugging
const blacklistedHosts = new Map();

/**
 * Custom fetch implementation to prevent console spam and handle offline conditions.
 * Includes a Circuit Breaker to silence red browser network errors when a host is unreachable.
 */
const customFetch = async (url, options) => {
    let host = 'unknown';
    try {
        host = new URL(url).host;
    } catch (e) { /* ignore */ }

    // 1. Check navigator.onLine first
    if (typeof window !== 'undefined' && !navigator.onLine) {
        return new Response(
            JSON.stringify({ error: 'offline', message: 'No internet connection' }),
            {
                status: 503,
                statusText: 'Service Unavailable (Offline)',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // 2. Circuit Breaker: Check if this host is temporarily blacklisted
    const blacklistExpiry = blacklistedHosts.get(host);
    if (blacklistExpiry && Date.now() < blacklistExpiry) {
        return new Response(
            JSON.stringify({ 
                error: 'circuit_breaker', 
                message: `Requests to ${host} are temporarily blocked to prevent console noise.` 
            }),
            {
                status: 503,
                statusText: 'Service Unavailable (Circuit Breaker)',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        const response = await fetch(url, options);
        // Success! Clear blacklist for this host
        blacklistedHosts.delete(host);
        return response;
    } catch (error) {
        // 3. Handle network exceptions (DNS failure, timeout, etc.)
        const now = Date.now();
        
        // Mark as blacklisted to prevent native fetch() calls (and red browser logs) for a while
        blacklistedHosts.set(host, now + CIRCUIT_BREAKER_DURATION_MS);

        if (now - lastLoggedTime > LOG_THROTTLE_MS) {
            console.warn(`[Supabase Fetch] Host ${host} unreachable. Circuit breaker active for 60s.`);
            lastLoggedTime = now;
        }

        // Return a controlled 503 response instead of letting the exception bubble up.
        // This silences the noisy 'TypeError: Failed to fetch' stack trace in the console.
        return new Response(
            JSON.stringify({ error: 'network_error', message: error.message }),
            {
                status: 503,
                statusText: 'Service Unavailable (Network Error)',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        fetch: customFetch
    }
});
