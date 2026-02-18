import { supabase } from '@/integrations/supabase/client';

/**
 * LedgerService
 * Handles financial ledger operations.
 */
export const ledgerService = {
    /**
     * Get ledger entries for a labourer
     * @param {string} labourerId
     * @returns {Promise<any[]>}
     */
    async getLedger(labourerId) {
        const { data, error } = await supabase
            .from('labour_ledger')
            .select('*')
            .eq('labourer_id', labourerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get running balance for a labourer
     * @param {string} labourerId
     * @returns {Promise<number>}
     */
    async getBalance(labourerId) {
        const { data, error } = await supabase
            .from('labour_ledger')
            .select('amount, transaction_type')
            .eq('labourer_id', labourerId);

        if (error) throw error;

        // Calculate balance: Credit (Work) - Debit (Payment)
        // Adjust logic if Pay is Credit and Work is Debit depending on perspective.
        // Usually: Work = Payable (Credit to Labourer Account), Payment = Paid (Debit from Labourer Account)
        // Positive Balance = We owe them.

        return data.reduce((acc, curr) => {
            return curr.transaction_type === 'CREDIT'
                ? acc + Number(curr.amount)
                : acc - Number(curr.amount);
        }, 0);
    }
};
