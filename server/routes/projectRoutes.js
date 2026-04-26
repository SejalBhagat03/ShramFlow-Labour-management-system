const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middlewares/authMiddleware');

const intelligenceService = require('../services/intelligenceService');

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
            .eq('organization_id', req.orgId)
            .or('is_deleted.eq.false,is_deleted.is.null');

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

        console.log(`[Projects] Fetching for org: ${req.orgId}...`);

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('organization_id', req.orgId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Projects] DB Error:', error.message);
            return res.status(500).json({ error: error.message });
        }

        console.log(`[Projects] Found ${data?.length || 0} projects.`);
        res.json(data || []);
    } catch (error) {
        console.error('[Projects] Route Crash:', error.message);
        next(error);
    }
});

// Create new project
router.post('/', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        const { name, description, budget, site_location, start_date, end_date, work_type, total_work_target } = req.body;
        const { data, error } = await supabase
            .from('projects')
            .insert({ 
                name, 
                description, 
                budget, 
                site_location, 
                start_date, 
                end_date, 
                work_type, 
                total_work_target,
                organization_id: req.orgId 
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
});

// Get project by ID
router.get('/:id', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Project not found' });
        
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Get AI Project Intelligence (Predictive analytics)
router.get('/:id/intelligence', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const insight = await intelligenceService.getProjectHealth(id);
        res.json(insight);
    } catch (error) {
        next(error);
    }
});

// Soft delete project (Move to trash)
router.delete('/:id', protect, authorize(['supervisor', 'admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const orgId = req.orgId;

        // 1. Mark as deleted in projects table
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('name')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (fetchError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update({ 
                is_deleted: true, 
                deleted_at: new Date().toISOString() 
            })
            .eq('id', id)
            .eq('organization_id', orgId);

        if (updateError) throw updateError;

        // 2. Add to trash table
        const { error: trashError } = await supabase
            .from('trash')
            .insert({
                organization_id: orgId,
                entity_type: 'Project',
                entity_id: id,
                display_name: project.name,
                deleted_by: req.user.id,
                metadata: {
                    name: project.name,
                    deleted_at: new Date().toISOString()
                }
            });

        if (trashError) {
            console.error('[ProjectDelete] Trash log error:', trashError);
            // Non-blocking for the user, but good to know
        }

        res.json({ message: 'Project moved to trash' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
