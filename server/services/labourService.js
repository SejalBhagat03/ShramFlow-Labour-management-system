const supabase = require('../config/supabase');

/**
 * LabourService
 * Handles complex business logic for labour-related financial data.
 */
class LabourService {
    /**
     * Get a comprehensive ledger for a specific labourer using the Transaction Engine
     * @param {string} labourId 
     * @param {string} orgId 
     * @returns {Promise<Object>}
     */
    async getLabourLedger(labourId, orgId) {
        // 1. Fetch labourer details
        const { data: labour, error: labourError } = await supabase
            .from('labourers')
            .select('*')
            .eq('id', labourId)
            .eq('organization_id', orgId)
            .single();

        if (labourError) throw labourError;

        // 2. Fetch all transactions from the unified ledger
        const { data: transactions, error: ledgerError } = await supabase
            .from('labour_ledger')
            .select('*')
            .eq('labourer_id', labourId)
            .order('created_at', { ascending: true }); // ASC for correct running balance calculation

        if (ledgerError) throw ledgerError;

        // 3. Calculate running balance and summaries
        let runningBalance = 0;
        let totalEarned = 0;
        let totalPaid = 0;
        let totalAdvances = 0;
        let totalDeductions = 0;

        const ledgerEntries = (transactions || []).map(tx => {
            const amount = Number(tx.amount || 0);
            
            if (tx.transaction_type === 'CREDIT') {
                runningBalance += amount;
                totalEarned += amount;
            } else {
                runningBalance -= amount;
                if (tx.category === 'advance') {
                    totalAdvances += amount;
                } else if (tx.category === 'deduction') {
                    totalDeductions += amount;
                } else {
                    totalPaid += amount;
                }
            }

            return {
                ...tx,
                running_balance: runningBalance
            };
        });

        // 4. Sort by most recent for UI presentation
        ledgerEntries.reverse();

        return {
            labourId,
            name: labour.name,
            name_hindi: labour.name_hindi,
            phone: labour.phone,
            totalEarned,
            totalPaid,
            totalAdvances,
            totalDeductions,
            balance: runningBalance,
            transactions: ledgerEntries
        };
    }

    /**
     * Get only the current balance for a labourer using optimized RPC
     * @param {string} labourId 
     * @param {string} orgId 
     * @returns {Promise<number>}
     */
    async getLabourBalance(labourId, orgId) {
        try {
            const { data, error } = await supabase.rpc('get_labour_balance', { 
                labour_uuid: labourId 
            });
            
            if (error) throw error;
            return Number(data || 0);
        } catch (error) {
            console.error('[LabourService.getLabourBalance] Error:', error);
            // Fallback to manual calculation if RPC fails
            const ledger = await this.getLabourLedger(labourId, orgId);
            return ledger.balance;
        }
    }
}

module.exports = new LabourService();
