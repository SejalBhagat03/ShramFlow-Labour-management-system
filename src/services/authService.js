import { supabase } from '@/integrations/supabase/client';
import { User } from '../models/User';

/**
 * AuthService
 * FINAL STABLE VERSION
 * - No retries
 * - No fake fallback users
 * - No emergency overrides
 * - Works ONLY when RLS is correct (as it should)
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
     */
    async getUserProfile(userId) {
        console.log('AuthService: fetching profile for', userId);

        // 1️⃣ Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            console.error('Profile fetch failed:', profileError);
            throw profileError;
        }

        // 2️⃣ Fetch role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (roleError) {
            console.error('Role fetch failed:', roleError);
            throw roleError;
        }

        // 3️⃣ Return normalized User
        return new User({
            id: userId,
            email: '', // email comes from session
            name: profile.full_name || 'User',
            role: roleData.role,
            phone: profile.phone || '',
            avatar_url: profile.avatar_url || ''
        });
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
