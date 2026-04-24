const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Get projects with 'Pulse' metrics (budget used, today's workforce)
router.get('/pulse', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        if (!req.orgId) {
            return res.status(403).json({ error: 'Organization context required for Pulse metrics' });
        }

        // Query projects and their work entries
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                work_entries(amount, date, labourer_id)
            `)
            .eq('organization_id', req.orgId);

        if (error) {
            console.error('[ProjectPulse] DB Error:', error);
            throw error;
        }

        if (!data) return res.json([]);

        // Process data to get aggregates
        const today = new Date().toISOString().split('T')[0];
        const pulsedData = data.map(project => {
            // Assume all returned entries are valid (no is_deleted column exists)
            const entries = project.work_entries || [];
            
            const budgetUsed = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const activeToday = new Set(
                entries.filter(e => e.date === today).map(e => e.labourer_id)
            ).size;

            // Remove the raw entries to keep payload small
            const { work_entries, ...rest } = project;
            return {
                ...rest,
                budget_used: budgetUsed,
                active_today: activeToday
            };
        });

        res.json(pulsedData);
    } catch (error) {
        next(error);
    }
});

// Get all projects for org
router.get('/', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        if (!req.orgId) {
            return res.status(403).json({ error: 'Organization context required' });
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('organization_id', req.orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Create new project
router.post('/', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const { data, error } = await supabase
            .from('projects')
            .insert({ name, description, organization_id: req.orgId })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
