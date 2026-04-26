import { supabase } from '@/lib/supabase';
import { User } from '@/lib/models/User';

/**
 * AuthService
 * Optimized with detailed logging and performance tracking
 */
export const authService = {
    /**
     * Get current session
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    },

    /**
     * Fetch user profile + role
     * Optimized with detailed timing and logging
     */
    async getUserProfile(userId, sessionUser = null) {
        const start = performance.now();
        const log = (msg) => {
            if (import.meta.env.DEV) console.log(`[authService] ${msg} (${(performance.now() - start).toFixed(0)}ms)`);
        };

        log(`Starting profile fetch for ${userId}`);

        try {
            // 1 & 2. Fetch profile and role in parallel for speed
            log(`DB Calling: profiles and user_roles in parallel for ${userId}`);
            
            const [profileRes, roleRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
            ]);

            const { data: profile, error: profileError } = profileRes;
            const { data: roleData, error: roleError } = roleRes;

            if (profileError) log(`Profile DB Error: ${profileError.message}`);
            if (roleError) log(`Role DB Error: ${roleError.message}`);

            // 3. Sync and Return
            if (profile || roleData) {
                log(`Constructing User object from DB results (${roleData?.role || profile?.role || 'fallback'})`);
                return new User({
                    id: userId,
                    email: profile?.email || sessionUser?.email || '',
                    name: profile?.full_name || profile?.name || sessionUser?.user_metadata?.full_name || 'User',
                    role: roleData?.role || profile?.role || sessionUser?.user_metadata?.role || 'labour',
                    phone: profile?.phone || sessionUser?.user_metadata?.phone || '',
                    avatar_url: profile?.avatar_url || '',
                    organization_id: profile?.organization_id || sessionUser?.user_metadata?.organization_id || null
                });
            }

            log(`No DB record found, checking metadata fallback...`);

            // 4. Fallback to metadata
            if (sessionUser?.user_metadata?.role) {
                const meta = sessionUser.user_metadata;
                log(`Using metadata fallback: ${meta.role}`);
                return new User({
                    id: userId,
                    email: sessionUser.email || '',
                    name: meta.full_name || 'User',
                    role: meta.role,
                    phone: meta.phone || '',
                    avatar_url: meta.avatar_url || '',
                    organization_id: meta.organization_id || null
                });
            }

            log(`Fatal: No profile data found anywhere`);
            return new User({
                id: userId,
                email: sessionUser?.email || '',
                name: 'User',
                role: 'labour',
                phone: '',
                avatar_url: '',
                organization_id: null
            });

        } catch (err) {
            log(`Critical Catch: ${err.message}`);
            throw err;
        }
    },

    /**
     * Sign out
     */
    async signOut() {
        await supabase.auth.signOut();
    },

    /**
     * Auth state listener
     */
    onAuthStateChange(callback) {
        const { data: { subscription } } =
            supabase.auth.onAuthStateChange(callback);
        return subscription;
    }
};
