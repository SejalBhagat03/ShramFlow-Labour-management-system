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
        const isSuperAdmin = req.user.user_metadata?.role === 'superadmin';
        
        let query = supabase
            .from('audit_logs')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (!isSuperAdmin) {
            query = query.eq('organization_id', req.orgId);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('[AuditRoutes] Error fetching logs:', error);
        next(error);
    }
});

module.exports = router;
