const supabase = require('../config/supabase');

/**
 * moveToTrash
 * Service to handle soft-deletion and snapshotting to the trash table.
 */
exports.moveToTrash = async ({ table, id, orgId, userId }) => {
    // 1. Fetch current data for snapshot
    const { data: record, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

    if (fetchError || !record) {
        throw new Error(`${table} record not found with ID ${id}`);
    }

    // 2. Create Trash Snapshot
    const tableToEntity = {
        'labourers': 'Labourer',
        'work_entries': 'WorkEntry',
        'payments': 'Payment',
        'projects': 'Project',
        'work_acknowledgments': 'WorkDispute'
    };

    const entityType = tableToEntity[table] || (table.charAt(0).toUpperCase() + table.slice(1, -1));

    const { error: trashError } = await supabase
        .from('trash')
        .insert({
            organization_id: orgId,
            entity_type: entityType,
            entity_id: id,
            data: record,
            deleted_by: userId
        });

    if (trashError) throw trashError;

    // 3. Perform Soft Delete
    const { error: deleteError } = await supabase
        .from(table)
        .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('organization_id', orgId);

    if (deleteError) throw deleteError;

    return record;
};
