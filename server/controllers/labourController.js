const supabase = require('../config/supabase');
const labourService = require('../services/labourService');
const { logAudit } = require('../utils/logger');

exports.getAllLabourers = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .eq('organization_id', req.orgId);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.createLabourer = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('labourers')
            .insert({ ...req.body, organization_id: req.orgId })
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit({
            req,
            action: 'CREATE',
            entityType: 'Labourer',
            entityId: data.id,
            newValue: data
        });

        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

exports.getWorkHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('work_entries')
            .select('*')
            .eq('labourer_id', id)
            .eq('organization_id', req.orgId)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getLedger = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ledger = await labourService.getLabourLedger(id, req.orgId);
        res.json(ledger);
    } catch (error) {
        next(error);
    }
};
