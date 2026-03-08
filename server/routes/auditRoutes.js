const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * GET /api/audit
 * Fetch audit logs for the current organization
 */
router.get('/', protect, authorize(['supervisor']), async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, profiles(full_name)')
            .eq('organization_id', req.orgId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
