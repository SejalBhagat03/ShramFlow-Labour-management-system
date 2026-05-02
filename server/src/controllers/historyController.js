const supabase = require('../config/supabase');

exports.getEditHistory = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const { data, error } = await supabase
            .from('edit_history')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};
