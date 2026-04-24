const commandCenterService = require('../services/commandCenterService');

/**
 * commandCenterController
 * Exposes intelligent insights to the supervisor.
 */
exports.getDashboardData = async (req, res, next) => {
    try {
        if (!req.orgId) {
            return res.status(403).json({ error: 'Organization context required' });
        }

        const data = await commandCenterService.getInsights(req.orgId, req.user.id);
        res.json(data);
    } catch (error) {
        console.error('[CommandCenter] Controller Error:', error);
        next(error);
    }
};
