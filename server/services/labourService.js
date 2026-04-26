const supabase = require('../config/supabase');

/**
 * LabourService
 * Handles complex business logic for labour-related financial data.
 */
class LabourService {
    /**
     * Get a comprehensive ledger for a specific labourer
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

        // 2. Fetch all approved/paid work entries
        const { data: workEntries, error: workError } = await supabase
            .from('work_entries')
            .select('*')
            .eq('labourer_id', labourId)
            .eq('organization_id', orgId)
            .in('status', ['approved', 'paid'])
            .order('date', { ascending: false });

        if (workError) throw workError;

        // 3. Fetch all payment records
        const { data: payments, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('labourer_id', labourId)
            .eq('organization_id', orgId)
            .eq('status', 'paid')
            .order('transaction_date', { ascending: false });

        if (paymentError) throw paymentError;

        // 4. Calculate summaries
        const totalEarned = workEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        
        let totalPaid = 0;
        let totalDeductions = 0;

        payments.forEach(payment => {
            if (payment.payment_type === 'deduction') {
                totalDeductions += (Number(payment.amount) || 0);
            } else {
                totalPaid += (Number(payment.amount) || 0);
            }
        });

        // Balance = Earned - Paid - Deducted
        const balance = totalEarned - totalPaid - totalDeductions;

        return {
            labourId,
            name: labour.name,
            name_hindi: labour.name_hindi,
            phone: labour.phone,
            totalEarned,
            totalPaid,
            totalDeductions,
            balance,
            entries: workEntries,
            payments: payments
        };
    }

    /**
     * Get only the current balance for a labourer
     * @param {string} labourId 
     * @param {string} orgId 
     * @returns {Promise<number>}
     */
    async getLabourBalance(labourId, orgId) {
        try {
            const ledger = await this.getLabourLedger(labourId, orgId);
            return ledger.balance;
        } catch (error) {
            console.error('[LabourService.getLabourBalance] Error:', error);
            return 0;
        }
    }
}

module.exports = new LabourService();
