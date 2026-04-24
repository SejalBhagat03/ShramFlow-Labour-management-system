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
