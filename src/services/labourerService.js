import { supabase } from '@/integrations/supabase/client';

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
        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
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
