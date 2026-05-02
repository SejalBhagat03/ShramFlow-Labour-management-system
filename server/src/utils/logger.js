const supabase = require('../config/supabase');

/**
 * logAudit
 * Internal utility to log system actions to the audit_logs table.
 */
const logAudit = async ({
    req,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null
}) => {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            organization_id: req.orgId,
            user_id: req.user.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_value: oldValue,
            new_value: newValue,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        if (error) {
            console.error('Audit Log Error:', error);
        }
    } catch (err) {
        console.error('Failed to log audit activity:', err);
    }
};

module.exports = { logAudit };
