const supabase = require('../config/supabase');
const labourService = require('../services/labourService');
const baseService = require('../services/baseService');
const { logAudit } = require('../utils/logger');

exports.getAllLabourers = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .eq('organization_id', req.orgId)
            .eq('is_deleted', false);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getLabourerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getLabourBalance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const balance = await labourService.getLabourBalance(id, req.orgId);
        res.json(balance);
    } catch (error) {
        next(error);
    }
};

exports.getLabourStats = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.rpc('get_labour_stats', { 
            labour_uuid: id 
        });

        if (error) throw error;
        res.json(data || { total_earned: 0, total_paid: 0 });
    } catch (error) {
        next(error);
    }
};

exports.createLabourer = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('labourers')
            .insert({ 
                ...req.body, 
                organization_id: req.orgId,
                supervisor_id: req.user.id,
                daily_rate: parseFloat(req.body.daily_rate || 0),
                rate_per_meter: parseFloat(req.body.rate_per_meter || 0)
            })
            .select()
            .single();

        if (error) {
            console.error('[Create Labourer DB Error]:', error);
            throw error;
        }

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

exports.updateLabourer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('labourers')
            .update({ ...req.body })
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit({
            req,
            action: 'UPDATE',
            entityType: 'Labourer',
            entityId: id,
            newValue: data
        });

        res.json(data);
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

/**
 * deleteLabourer (Soft Delete)
 */
exports.deleteLabourer = async (req, res, next) => {
    try {
        const { id } = req.params;

        const labour = await baseService.moveToTrash({
            table: 'labourers',
            id,
            orgId: req.orgId,
            userId: req.user.id
        });

        // 4. Cascading Soft Delete for Work Entries (Internal mark)
        await supabase
            .from('work_entries')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('labourer_id', id)
            .eq('organization_id', req.orgId);

        // Log audit
        await logAudit({
            req,
            action: 'DELETE',
            entityType: 'Labourer',
            entityId: id,
            newValue: { ...labour, is_deleted: true }
        });

        res.json({ message: 'Labourer moved to Recycle Bin' });
    } catch (error) {
        next(error);
    }
};
