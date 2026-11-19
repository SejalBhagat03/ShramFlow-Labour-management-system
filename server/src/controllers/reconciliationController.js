const reconciliationService = require('../services/reconciliationService');
const supabase = require('../config/supabase');

exports.getReconciliationReport = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        // Fetch pending claims (submitted status)
        const { data: claims, error } = await supabase
            .from('work_entries')
            .select('*, labourers(name), projects(name)')
            .eq('organization_id', req.orgId)
            .eq('status', 'submitted')
            .eq('is_deleted', false);

        if (error) throw error;

        if (!claims || claims.length === 0) {
            return res.json({ message: 'No pending claims found', results: [] });
        }

        // Analyze claims
        const reconciledData = await reconciliationService.reconcileClaims(claims, req.orgId);

        res.json({
            success: true,
            results: reconciledData
        });
    } catch (error) {
        console.error('[ReconciliationController] getReconciliationReport Error:', error);
        next(error);
    }
};

exports.applyReconciliation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adjustedAmount, trustScore, flag } = req.body;
        
        // Update the work entry to apply adjustment
        const { data, error } = await supabase
            .from('work_entries')
            .update({ 
                meters: adjustedAmount, // Overwrite the claimed amount with the adjusted one
                work_done: adjustedAmount,
                flags: flag ? [flag, `TrustScore: ${trustScore}`] : [`TrustScore: ${trustScore}`],
                status: 'approved' // Automatically approve it after reconciliation
            })
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data,
            message: 'Claim reconciled and approved'
        });

    } catch (error) {
        console.error('[ReconciliationController] applyReconciliation Error:', error);
        next(error);
    }
}
