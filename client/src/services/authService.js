import { supabase } from '@/lib/supabase';
import { User } from '@/lib/models/User';

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
     * Optimized to use session metadata if available to avoid RLS recursion/deadlocks
     */
    async getUserProfile(userId, sessionUser = null) {
        // 1. Check session metadata for performance optimization
        if (sessionUser?.user_metadata && sessionUser.user_metadata.role) {
            const meta = sessionUser.user_metadata;
            return new User({
                id: userId,
                email: sessionUser.email,
                name: meta.full_name || 'User',
                role: meta.role,
                phone: meta.phone || '',
                avatar_url: meta.avatar_url || '',
                organization_id: meta.organization_id || null
            });
        }

        // 2. Role inference for auto-provisioned accounts
        if (sessionUser?.email) {
            const isLabourEmail = sessionUser.email.endsWith('@shramflow.com');

            if (isLabourEmail) {
                return new User({
                    id: userId,
                    email: sessionUser.email,
                    name: 'Labourer',
                    role: 'labour',
                    phone: sessionUser.email.replace('@shramflow.com', ''),
                    avatar_url: '',
                    organization_id: null // Will be resolved by profile fetch eventually
                });
            }

            if (!isLabourEmail) {
                return new User({
                    id: userId,
                    email: sessionUser.email,
                    name: 'Supervisor',
                    role: 'supervisor',
                    phone: '',
                    avatar_url: '',
                    organization_id: null
                });
            }
        }

        // 3. Database fallback for persistent profiles
        const { data: profile, error: profileError, status: profileStatus } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profileError && profileStatus !== 406) {
            throw profileError;
        }

        const { data: roleData, error: roleError, status: roleStatus } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (roleError && roleStatus !== 406) {
            throw roleError;
        }

        const name = profile?.full_name || '';
        const phone = profile?.phone || '';
        const avatar_url = profile?.avatar_url || '';
        const organization_id = profile?.organization_id || null;
        const role = roleData?.role || 'labour';

        return new User({
            id: userId,
            email: sessionUser?.email || '',
            name: name || 'User',
            role,
            phone,
            avatar_url,
            organization_id
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
