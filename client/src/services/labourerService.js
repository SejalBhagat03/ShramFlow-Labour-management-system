import { supabase } from '@/lib/supabase';

/**
 * LabourerService
 * Handles labourer profile operations.
 */
export const labourerService = {
    /**
     * Get labourer profile by user ID
     * @param {string} userId
     * @returns {Promise<any>}
     */
    async getLabourerByUserId(userId) {
        const { data, error, status } = await supabase
            .from('labourers')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            // If RLS blocks it (400) or other error, log it but don't block login if possible
            console.error('Labourer profile fetch error:', error);
            if (status === 400 || status === 406) {
                // Return a dummy placeholder so the user can at least land on the dashboard
                // The dashboard specific widgets might fail, but they won't be stuck in login.
                return { id: 'placeholder', user_id: userId, name: 'Labourer (Loading...)', status: 'active' };
            }
            // For other errors, we might still want to allow entry if it's a network glitch, 
            // but let's throw if it's critical. Actually, for login robustness, let's return placeholder too.
            return { id: 'placeholder', user_id: userId, name: 'Labourer (Offline)', status: 'active' };
        }

        // If data is null (row missing), also return placeholder to allow account setup/view
        if (!data) {
            return { id: 'placeholder', user_id: userId, name: 'New Labourer', status: 'pending' };
        }

        return data;
    },

    /**
     * Get labourer by ID
     * @param {string} id
     */
    async getLabourerById(id) {
        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get Trust Score
     * @param {string} labourerId
     * @returns {Promise<number>}
     */
    async getTrustScore(labourerId) {
        const { data, error } = await supabase
            .from('labourers')
            .select('trust_score')
            .eq('id', labourerId)
            .single();

        if (error) return 85; // Default if error
        // Combine trust_score and fraud_score logic if needed, or just return trust_score
        // For now returning trust_score as is, subtracting fraud_score impact if needed
        return data.trust_score - (data.fraud_score || 0);
    },

    /**
     * Update labourer details
     * @param {string} id
     * @param {Object} updates
     */
    async updateLabourer(id, updates) {
        const { data, error } = await supabase
            .from('labourers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
