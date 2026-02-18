import { supabase } from '@/integrations/supabase/client';
import { WorkEntry } from '../models/WorkEntry';

/**
 * WorkService
 * Handles work entries, disputes, and related data.
 */
export const workService = {
    /**
     * Fetch work entries for a specific labourer
     * @param {string} labourerId
     * @returns {Promise<WorkEntry[]>}
     */
    async getWorkEntries(labourerId) {
        const { data, error } = await supabase
            .from('work_entries')
            .select('*')
            .eq('labourer_id', labourerId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data.map(entry => new WorkEntry(entry));
    },

    /**
     * Create a new work entry
     * @param {Object} entryData
     * @returns {Promise<WorkEntry>}
     */
    async createWorkEntry(entryData) {
        const { data, error } = await supabase
            .from('work_entries')
            .insert(entryData)
            .select()
            .single();

        if (error) throw error;
        return new WorkEntry(data);
    },

    /**
     * Create multiple work entries (Bulk Insert)
     * @param {Object[]} entriesData
     * @returns {Promise<WorkEntry[]>}
     */
    async createBulkWorkEntries(entriesData) {
        const { data, error } = await supabase
            .from('work_entries')
            .insert(entriesData)
            .select();

        if (error) throw error;
        return data.map(entry => new WorkEntry(entry));
    },

    /**
     * Fetch pending acknowledgments
     * @param {string} labourerId
     * @returns {Promise<any[]>}
     */
    async getPendingAcknowledgments(labourerId) {
        const { data, error } = await supabase
            .from('work_acknowledgments')
            .select('*, daily_work_register(*)')
            .eq('labourer_id', labourerId)
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    },

    /**
     * Ackowledge (Confirm/Dispute) a work entry
     * @param {string} ackId
     * @param {string} status
     * @param {string} [notes]
     */
    async acknowledgeWork(ackId, status, notes) {
        const { error } = await supabase
            .from('work_acknowledgments')
            .update({ status, notes, responded_at: new Date().toISOString() })
            .eq('id', ackId);

        if (error) throw error;
    }
};
