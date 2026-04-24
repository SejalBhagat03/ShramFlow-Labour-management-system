const supabase = require('../config/supabase');
const { logAudit } = require('../utils/logger');
const baseService = require('../services/baseService');

exports.getAllWorkEntries = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { data, error } = await supabase
            .from('work_entries')
            .select('*, labourer:labourers(*), project:projects(*)')
            .eq('organization_id', req.orgId)
            .eq('is_deleted', false);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * detectAnomalies
 * Checks for suspicious record-keeping patterns
 */
const detectAnomalies = async (entry, orgId) => {
    let flags = [];
    const { labourer_id, project_id, date, amount, meters, work_done } = entry;
    const workValue = Number(work_done || meters || 0);

    try {
        // 1. PROJECT TARGET CHECK (Critical)
        if (project_id) {
            const { data: project } = await supabase
                .from('projects')
                .select('total_work_target, total_work_done')
                .eq('id', project_id)
                .single();
            
            if (project && project.total_work_target > 0) {
                if ((Number(project.total_work_done) + workValue) > project.total_work_target) {
                    flags.push('CRITICAL_TARGET_EXCEEDED');
                }
            }
        }

        // 2. DAILY PERFORMANCE LIMIT (15m Threshold)
        if (workValue > 15) {
            flags.push('HIGH_DAILY_WORK');
        }

        // 3. SMARTER HISTORICAL ANOMALY (1.5x Average)
        const { data: history } = await supabase
            .from('work_entries')
            .select('work_done, meters')
            .eq('labourer_id', labourer_id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (history && history.length >= 3) {
            const avg = history.reduce((acc, curr) => acc + Number(curr.work_done || curr.meters || 0), 0) / history.length;
            if (workValue > avg * 1.5 && avg > 0) {
                flags.push('ANOMALY_VS_AVERAGE');
            }
        }

        // 4. DUPLICATE CHECK
        const { data: duplicates } = await supabase
            .from('work_entries')
            .select('id')
            .eq('labourer_id', labourer_id)
            .eq('date', date)
            .eq('is_deleted', false);

        if (duplicates && duplicates.length > 0) {
            flags.push('DUPLICATE_ENTRY');
        }
    } catch (e) {
        console.warn('[AnomalyDetection] Utility failed:', e.message);
    }

    return flags;
};

exports.createWorkEntry = async (req, res, next) => {
    try {
        const { labourer_id, project_id, date, task_type, meters, work_done, rate_applied, amount, status = 'pending' } = req.body;

        // Basic validation
        if (!labourer_id || !date || (!meters && !work_done)) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['labourer_id', 'date', 'work_done'] 
            });
        }

        // --- AUTOMATION: Calculate Amount if Missing ---
        let finalAmount = amount;
        let finalRate = rate_applied;
        const workVolume = work_done || meters;

        if (!finalAmount && project_id) {
            // Fetch project default rate if not provided
            const { data: project } = await supabase
                .from('projects')
                .select('default_rate, rate_type')
                .eq('id', project_id)
                .single();
            
            finalRate = finalRate || project?.default_rate || 1; // Fallback to 1 if not set
            finalAmount = workVolume * finalRate;
        }

        // --- ADVANCED ANOMALY DETECTION ---
        const flags = await detectAnomalies({ ...req.body, amount: finalAmount, meters: workVolume }, req.orgId);

        const { data, error } = await supabase
            .from('work_entries')
            .insert({ 
                ...req.body, 
                amount: finalAmount, 
                rate_applied: finalRate,
                status, 
                organization_id: req.orgId, 
                flags 
            })
            .select()
            .single();

        if (error) throw error;

        // --- AUTOMATION: Update Project Stats ---
        if (project_id) {
            await supabase.rpc('update_project_stats', { _project_id: project_id });
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

/**
 * bulkCreateWorkEntries
 * Handles bulk insert with anomaly detection and automation
 */
exports.bulkCreateWorkEntries = async (req, res, next) => {
    try {
        const { entries } = req.body; // Array of entries
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty entries array' });
        }

        const projectIds = new Set();
        const processedEntries = [];

        for (const entry of entries) {
            const { labourer_id, project_id, date, meters, work_done, rate_applied, amount } = entry;
            
            // --- AUTOMATION: Calculate Amount if Missing ---
            let finalAmount = amount;
            let finalRate = rate_applied;
            const workVolume = work_done || meters;

            if (!finalAmount && project_id) {
                const { data: project } = await supabase
                    .from('projects')
                    .select('default_rate')
                    .eq('id', project_id)
                    .single();
                
                finalRate = finalRate || project?.default_rate || 1;
                finalAmount = workVolume * finalRate;
            }

            // --- ADVANCED ANOMALY DETECTION ---
            const flags = await detectAnomalies({ ...entry, amount: finalAmount, meters: workVolume }, req.orgId);

            processedEntries.push({
                ...entry,
                amount: finalAmount,
                rate_applied: finalRate,
                organization_id: req.orgId,
                flags,
                status: 'pending' // Default for group entries
            });

            if (project_id) projectIds.add(project_id);
        }

        const { data, error } = await supabase
            .from('work_entries')
            .insert(processedEntries)
            .select();

        if (error) throw error;

        // --- AUTOMATION: Update Project Stats ---
        for (const pId of projectIds) {
            await supabase.rpc('update_project_stats', { _project_id: pId });
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('[WorkController] Bulk Error:', error);
        next(error);
    }
};

/**
 * undoLastEntry
 * Reverts the most recent work entry if created within the last 10 minutes
 */
exports.undoLastEntry = async (req, res, next) => {
    try {
        // 1. Find the most recent entry for this org
        const { data: lastEntry, error: fetchError } = await supabase
            .from('work_entries')
            .select('*')
            .eq('organization_id', req.orgId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !lastEntry) {
            return res.status(404).json({ error: 'No recent work entries found to undo.' });
        }

        // 2. Check time window (10 mins)
        const createdAt = new Date(lastEntry.created_at);
        const now = new Date();
        const diffMins = (now - createdAt) / (1000 * 60);

        if (diffMins > 10) {
            return res.status(400).json({ 
                error: 'Undo window expired', 
                message: 'You can only undo entries within 10 minutes of creation.' 
            });
        }

        // 3. Perform soft delete
        const { error: deleteError } = await supabase
            .from('work_entries')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', lastEntry.id);

        if (deleteError) throw deleteError;

        // 4. Trigger Project Stat Update if applicable
        if (lastEntry.project_id) {
            await supabase.rpc('update_project_stats', { _project_id: lastEntry.project_id });
        }

        // 5. Log audit
        await logAudit({
            req,
            action: 'UNDO',
            entityType: 'WorkEntry',
            entityId: lastEntry.id,
            newValue: { ...lastEntry, is_deleted: true }
        });

        res.json({ 
            message: 'Last entry successfully undone', 
            undoneEntry: lastEntry 
        });
    } catch (error) {
        console.error('[WorkController] Undo Error:', error);
        next(error);
    }
};

/**
 * exportWeeklyReport
 * Generates a CSV report for the last 7 days
 */
exports.exportWeeklyReport = async (req, res, next) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data: entries, error } = await supabase
            .from('work_entries')
            .select('*, project:projects(name, health_status)')
            .eq('organization_id', req.orgId)
            .gte('date', startDate)
            .eq('is_deleted', false)
            .order('date', { ascending: false });

        if (error) throw error;

        // Grouping logic for more useful CSV rows (Project + Date combinations)
        const rows = [
            ['Date', 'Project Name', 'Work Done', 'Workers Count', 'Amount Paid', 'Health Status', 'Generated At'].join(',')
        ];

        const timestamp = new Date().toLocaleString();
        
        entries.forEach(e => {
            const row = [
                e.date,
                `"${e.project?.name || 'Unknown'}"`,
                e.meters || e.work_done || 0,
                1, // In this detailed view, 1 entry = 1 worker
                e.amount || 0,
                e.project?.health_status || 'Good',
                `"${timestamp}"`
            ].join(',');
            rows.push(row);
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ShramFlow_Weekly_Report_${startDate}.csv`);
        res.status(200).send(rows.join('\n'));

    } catch (error) {
        console.error('[WorkController] Export Error:', error);
        next(error);
    }
};

exports.updateWorkEntry = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Fetch old data for history
        const { data: oldData, error: fetchError } = await supabase
            .from('work_entries')
            .select('*')
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .single();

        if (fetchError || !oldData) {
            return res.status(404).json({ error: 'Work Entry not found' });
        }

        // 2. Perform Update
        const { data: newData, error: updateError } = await supabase
            .from('work_entries')
            .update(req.body)
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 3. Log to edit_history
        await supabase.from('edit_history').insert({
            organization_id: req.orgId,
            entity_id: id,
            entity_type: 'WorkEntry',
            previous_data: oldData, // Captured old data
            updated_data: newData,
            reason: req.body.editReason || 'Standard Update',
            updated_by: req.user.id
        });

        res.json(newData);
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

/**
 * deleteWorkEntry (Soft Delete)
 */
exports.deleteWorkEntry = async (req, res, next) => {
    try {
        const { id } = req.params;

        const workEntry = await baseService.moveToTrash({
            table: 'work_entries',
            id,
            orgId: req.orgId,
            userId: req.user.id
        });

        // Log audit
        await logAudit({
            req,
            action: 'DELETE',
            entityType: 'WorkEntry',
            entityId: id,
            newValue: { ...workEntry, is_deleted: true }
        });

        res.json({ message: 'Work Entry moved to Recycle Bin' });
    } catch (error) {
        next(error);
    }
};
