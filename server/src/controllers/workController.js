const supabase = require('../config/supabase');
const { logAudit } = require('../utils/logger');
const baseService = require('../services/baseService');
const equiflowService = require('../services/equiflowService');

exports.getAllWorkEntries = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { page = 1, limit = 10, status, search = '' } = req.query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('work_entries')
            .select('*, labourer:labourers(*), project:projects(*)', { count: 'exact' })
            .eq('organization_id', req.orgId)
            .eq('is_deleted', false)
            .order('date', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            // Complex search across joined table might need ilike on labourer.name
            // But since we are using Supabase JS client, we might need to filter by labourer name differently
            // if we want to do it in one query.
            // Simplified: Search in task_type or description for now.
            query = query.or(`task_type.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;
        
        res.json({
            data,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * detectAnomalies
 * Replaces basic thresholds with statistical analysis and concurrency checks.
 */
const detectAnomalies = async (entry, orgId) => {
    let flags = [];
    const { labourer_id, project_id, date, meters, work_done } = entry;
    const workValue = Number(work_done || meters || 0);

    try {
        // 1. PROJECT TARGET CHECK
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

        // 2. CONCURRENCY CHECK (Same worker, same date, multiple projects)
        const { data: sameDayEntries } = await supabase
            .from('work_entries')
            .select('project_id, work_done, meters')
            .eq('labourer_id', labourer_id)
            .eq('date', date)
            .eq('is_deleted', false);

        if (sameDayEntries && sameDayEntries.length > 0) {
            const totalWorkToday = sameDayEntries.reduce((sum, e) => sum + Number(e.work_done || e.meters || 0), 0) + workValue;
            
            // Logic: A single human typically can't exceed 20 units of work alone in a day
            if (totalWorkToday > 20) {
                flags.push('IMPROBABLE_DAILY_TOTAL');
            }
            
            // Logic: Working on more than 2 projects in a single day is a logistics anomaly
            const projectCount = new Set([...sameDayEntries.map(e => e.project_id), project_id]).size;
            if (projectCount > 2) {
                flags.push('LOGISTICS_ANOMALY');
            }
        }

        // 3. STATISTICAL ANOMALY (Z-Score Logic)
        const { data: history } = await supabase
            .from('work_entries')
            .select('work_done, meters')
            .eq('labourer_id', labourer_id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (history && history.length >= 5) {
            const values = history.map(h => Number(h.work_done || h.meters || 0));
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
            
            // Logic: If work is > 2 Standard Deviations from mean, it's a statistical outlier
            if (stdDev > 0) {
                const zScore = (workValue - mean) / stdDev;
                if (zScore > 2.5) flags.push('STATISTICAL_OUTLIER_HIGH');
            } else if (workValue > mean * 2 && mean > 0) {
                flags.push('ANOMALY_VS_CONSISTENCY');
            }
        }

        // 4. DUPLICATE CHECK
        const isDuplicate = sameDayEntries?.some(e => 
            e.project_id === project_id && 
            Number(e.work_done || e.meters) === workValue
        );
        if (isDuplicate) flags.push('DUPLICATE_ENTRY');

    } catch (e) {
        console.warn('[AnomalyDetection] Advanced Engine failed:', e.message);
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
 * Optimized to handle large batches with minimal database round-trips.
 */
exports.bulkCreateWorkEntries = async (req, res, next) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty entries array' });
        }

        // 1. Gather all unique project IDs to pre-fetch rates
        const projectIds = [...new Set(entries.map(e => e.project_id).filter(Boolean))];
        let projectRates = {};

        if (projectIds.length > 0) {
            const { data: projects, error: pError } = await supabase
                .from('projects')
                .select('id, default_rate')
                .in('id', projectIds);
            
            if (!pError && projects) {
                projects.forEach(p => {
                    projectRates[p.id] = p.default_rate || 1;
                });
            }
        }

        const processedEntries = [];
        const uniqueProjectsInBatch = new Set();

        // 2. Process entries with local cache
        for (const entry of entries) {
            const { project_id, meters, work_done, rate_applied, amount } = entry;
            
            let finalRate = rate_applied || projectRates[project_id] || 1;
            const workVolume = work_done || meters || 0;
            let finalAmount = amount || (workVolume * finalRate);

            // Note: detectAnomalies still performs DB checks; for true perfection, 
            // that should also be batched, but we'll optimize the obvious bottleneck first.
            const flags = await detectAnomalies({ ...entry, amount: finalAmount, meters: workVolume }, req.orgId);

            processedEntries.push({
                ...entry,
                amount: finalAmount,
                rate_applied: finalRate,
                organization_id: req.orgId,
                flags,
                status: 'pending'
            });

            if (project_id) uniqueProjectsInBatch.add(project_id);
        }

        // 3. Batch insert
        const { data, error } = await supabase
            .from('work_entries')
            .insert(processedEntries)
            .select();

        if (error) throw error;

        // 4. Update Project Stats (Run in parallel for better speed)
        await Promise.all(
            Array.from(uniqueProjectsInBatch).map(pId => 
                supabase.rpc('update_project_stats', { _project_id: pId })
            )
        );

        res.status(201).json(data);
    } catch (error) {
        console.error('[WorkController] Optimized Bulk Error:', error);
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

        // 1. Organization context guard
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

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

        // 2. Perform core update
        const { data, error } = await supabase
            .from('work_entries')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (error) {
            console.error('[WorkController.updateWorkStatus] DB Update Error:', error.message, error.details, error.hint);
            return res.status(error.code === 'PGRST116' ? 404 : 400).json({ 
                error: 'Update failed', 
                message: error.message,
                details: error.details,
                hint: error.hint
            });
        }

        if (!data) {
            return res.status(404).json({ error: 'Work Entry not found' });
        }

        // 3. Log audit (Isolated)
        try {
            await logAudit({
                req,
                action: status === 'approved' ? 'APPROVE' : 'REJECT',
                entityType: 'WorkEntry',
                entityId: id,
                newValue: data
            });
        } catch (auditErr) {
            console.warn('[WorkController] Audit logging failed (non-critical):', auditErr.message);
        }

        // 4. Notify labourer (Isolated)
        try {
            // Fetch labourer user_id separately to avoid join issues in update query
            const { data: labourer } = await supabase
                .from('labourers')
                .select('user_id')
                .eq('id', data.labourer_id)
                .single();

            if (labourer?.user_id) {
                const { error: notifyError } = await supabase.rpc('create_notification', {
                    _org_id: req.orgId,
                    _user_id: labourer.user_id,
                    _title: status === 'approved' ? 'Work Approved' : 'Work Rejected',
                    _message: status === 'approved'
                        ? `Your work on ${data.date} for ${data.meters || data.work_done || 0}m has been approved.`
                        : `Your work on ${data.date} was rejected: ${rejected_reason}`,
                    _type: status === 'approved' ? 'success' : 'error',
                    _action_url: `/labour/${data.labourer_id}/ledger`
                });

                if (notifyError) {
                    console.warn('[WorkController] Notification RPC failed:', notifyError.message);
                }
            }
        } catch (notifyErr) {
            console.warn('[WorkController] Notification process failed (non-critical):', notifyErr.message);
        }

        res.json(data);
    } catch (error) {
        console.error('[WorkController.updateWorkStatus] Critical Unhandled Error:', error);
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

/**
 * getPendingAcknowledgments
 * Fetch pending acknowledgments for a labourer
 */
exports.getPendingAcknowledgments = async (req, res, next) => {
    try {
        const { labourerId } = req.query;
        
        // Security check: If role is labour, ensure they only fetch their own
        if (req.user.role === 'labour') {
            const { data: labourer } = await supabase
                .from('labourers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            
            if (!labourer || labourer.id !== labourerId) {
                return res.status(403).json({ error: 'Unauthorized to view these acknowledgments' });
            }
        }

        const { data, error } = await supabase
            .from('work_acknowledgments')
            .select('*, work_entries(*)')
            .eq('labourer_id', labourerId)
            .eq('status', 'pending');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * acknowledgeWork
 * Labourer confirms or disputes an entry
 */
exports.acknowledgeWork = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabase
            .from('work_acknowledgments')
            .update({ 
                status, 
                notes, 
                responded_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit({
            req,
            action: 'ACKNOWLEDGE',
            entityType: 'WorkAcknowledgment',
            entityId: id,
            newValue: data
        });

        res.json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * getSmartSplit
 * Provides EquiFlow recommendations for work distribution
 */
exports.getSmartSplit = async (req, res, next) => {
    try {
        const { labour_ids, total_quantity } = req.body;
        
        if (!labour_ids || !total_quantity) {
            return res.status(400).json({ error: 'Missing labour_ids or total_quantity' });
        }

        const recommendations = await equiflowService.calculateSmartDistribution(
            labour_ids, 
            total_quantity, 
            req.orgId
        );

        res.json(recommendations);
    } catch (error) {
        console.error('[WorkController] SmartSplit Error:', error);
        next(error);
    }
};
