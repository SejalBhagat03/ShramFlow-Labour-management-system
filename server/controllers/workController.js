const supabase = require('../config/supabase');
const { logAudit } = require('../utils/logger');

exports.getAllWorkEntries = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { data, error } = await supabase
            .from('work_entries')
            .select('*, labourers(*)')
            .eq('organization_id', req.orgId);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.createWorkEntry = async (req, res, next) => {
    try {
        const { labourer_id, date, task_type, amount, status = 'pending' } = req.body;

        // Basic validation
        if (!labourer_id || !date || !task_type || amount === undefined) {
            console.error('[WorkController] Missing required fields:', { labourer_id, date, task_type, amount });
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['labourer_id', 'date', 'task_type', 'amount'] 
            });
        }

        const { data, error } = await supabase
            .from('work_entries')
            .insert({ ...req.body, status, organization_id: req.orgId })
            .select()
            .single();

        if (error) {
            console.error('[WorkController] Supabase Insert Error:', error);
            return res.status(400).json({ error: error.message, details: error.hint });
        }

        // Log audit
        await logAudit({
            req,
            action: 'CREATE',
            entityType: 'WorkEntry',
            entityId: data.id,
            newValue: data
        });

        res.status(201).json(data);
    } catch (error) {
        console.error('[WorkController] Unexpected Error:', error);
        next(error);
    }
};

exports.updateWorkEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('work_entries')
            .update(req.body)
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (error) throw error;

        // Log edit history if table exists
        await supabase.from('edit_history').insert({
            organization_id: req.orgId,
            entity_id: id,
            entity_type: 'WorkEntry',
            previous_data: {}, // You'd fetch old data first if needed
            updated_data: data,
            reason: req.body.editReason
        });

        res.json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * updateWorkStatus
 * Approve or reject a work entry
 */
exports.updateWorkStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejected_reason } = req.body;

        const allowedStatuses = ['draft', 'submitted', 'approved', 'rejected', 'paid'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updates = {
            status,
            approved_by: status === 'approved' ? req.user.id : null,
            approved_at: status === 'approved' ? new Date().toISOString() : null,
            rejected_reason: status === 'rejected' ? rejected_reason : null
        };

        const { data, error } = await supabase
            .from('work_entries')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit({
            req,
            action: status === 'approved' ? 'APPROVE' : 'REJECT',
            entityType: 'WorkEntry',
            entityId: id,
            newValue: data
        });

        // Notify labourer
        await supabase.rpc('create_notification', {
            _org_id: req.orgId,
            _user_id: data.labourer_id,
            _title: status === 'approved' ? 'Work Approved' : 'Work Rejected',
            _message: status === 'approved'
                ? `Your work on ${data.date} for ${data.meters}m has been approved.`
                : `Your work on ${data.date} was rejected: ${rejected_reason}`,
            _type: status === 'approved' ? 'success' : 'error',
            _action_url: `/labour/${data.labourer_id}/ledger`
        });

        res.json(data);
    } catch (error) {
        next(error);
    }
};
