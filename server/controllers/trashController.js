const supabase = require('../config/supabase');

/**
 * Get all trashed items for the organization
 */
exports.getTrashItems = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('trash')
            .select('*')
            .eq('organization_id', req.orgId)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * Restore an item from the trash
 */
exports.restoreItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Get the trash record
        const { data: trashRecord, error: fetchError } = await supabase
            .from('trash')
            .from('trash')
            .select('*')
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .single();

        if (fetchError || !trashRecord) {
            return res.status(404).json({ error: 'Trash record not found' });
        }

        const { entity_type, entity_id } = trashRecord;
        
        // Map entity types to table names
        const tableMap = {
            'Labourer': 'labourers',
            'WorkEntry': 'work_entries',
            'Payment': 'payments',
            'Project': 'projects',
            'WorkDispute': 'work_disputes'
        };

        const tableName = tableMap[entity_type];
        if (!tableName) {
            return res.status(400).json({ error: 'Unknown entity type' });
        }

        // 2. Restore in the original table
        const { error: restoreError } = await supabase
            .from(tableName)
            .update({ is_deleted: false, deleted_at: null })
            .eq('id', entity_id)
            .eq('organization_id', req.orgId);

        if (restoreError) throw restoreError;

        // 3. Delete from trash
        const { error: deleteError } = await supabase
            .from('trash')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ message: `${entity_type} restored successfully` });
    } catch (error) {
        next(error);
    }
};

/**
 * Permanently delete an item
 */
exports.permanentDelete = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Get the trash record
        const { data: trashRecord, error: fetchError } = await supabase
            .from('trash')
            .select('*')
            .eq('id', id)
            .eq('organization_id', req.orgId)
            .single();

        if (fetchError || !trashRecord) {
            return res.status(404).json({ error: 'Trash record not found' });
        }

        const { entity_type, entity_id } = trashRecord;
        
        const tableMap = {
            'Labourer': 'labourers',
            'WorkEntry': 'work_entries',
            'Payment': 'payments',
            'Project': 'projects',
            'WorkDispute': 'work_disputes'
        };

        const tableName = tableMap[entity_type];

        // 2. Delete from original table (permanently)
        if (tableName) {
            const { error: permDeleteError } = await supabase
                .from(tableName)
                .delete()
                .eq('id', entity_id)
                .eq('organization_id', req.orgId);
            
            if (permDeleteError) throw permDeleteError;
        }

        // 3. Delete from trash
        const { error: deleteError } = await supabase
            .from('trash')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ message: `${entity_type} deleted permanently` });
    } catch (error) {
        next(error);
    }
};
