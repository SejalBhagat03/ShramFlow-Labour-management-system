const supabase = require('../config/supabase');

/**
 * EquiFlow Service
 * Intelligent labor distribution algorithm.
 */
class EquiFlowService {
    /**
     * calculateSmartDistribution
     * Returns suggested work shares for a group of labourers based on performance.
     */
    async calculateSmartDistribution(labourIds, totalQuantity, orgId) {
        if (!labourIds || labourIds.length === 0) return [];

        // 1. Fetch historical performance for these labourers
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: history } = await supabase
            .from('work_entries')
            .select('labourer_id, work_done, meters, date')
            .in('labourer_id', labourIds)
            .eq('organization_id', orgId)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .eq('is_deleted', false);

        // 2. Process metrics per labourer
        const stats = {};
        labourIds.forEach(id => {
            stats[id] = {
                totalWork: 0,
                daysActive: 0,
                velocity: 1, // Default base velocity
                recentLoad: 0, // Work in last 3 days
                burnoutRisk: 0
            };
        });

        const today = new Date();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(today.getDate() - 3);

        (history || []).forEach(entry => {
            const val = Number(entry.work_done || entry.meters || 0);
            const entryDate = new Date(entry.date);
            
            stats[entry.labourer_id].totalWork += val;
            stats[entry.labourer_id].daysActive += 1;

            if (entryDate >= threeDaysAgo) {
                stats[entry.labourer_id].recentLoad += val;
            }
        });

        // 3. Calculate Weightage
        let totalWeight = 0;
        const weights = {};

        labourIds.forEach(id => {
            const s = stats[id];
            const avgVelocity = s.daysActive > 0 ? (s.totalWork / s.daysActive) : 5; // Assume 5m avg if new
            
            // Burnout Penalty: If worked > 40m in last 3 days, reduce weight
            const burnoutPenalty = s.recentLoad > 40 ? 0.7 : 1.0;
            
            // Performance Boost: Experienced workers get slightly more (but capped to prevent overloading)
            const experienceBoost = Math.min(1.5, 1 + (s.totalWork / 500)); 

            const finalWeight = avgVelocity * burnoutPenalty * experienceBoost;
            weights[id] = finalWeight;
            totalWeight += finalWeight;
        });

        // 4. Final Allocation
        return labourIds.map(id => {
            const share = (weights[id] / totalWeight) * totalQuantity;
            return {
                labourer_id: id,
                suggested_quantity: Math.round(share * 100) / 100,
                metrics: {
                    velocity: (weights[id]).toFixed(1),
                    burnout_risk: stats[id].recentLoad > 40 ? 'High' : 'Low'
                }
            };
        });
    }

    /**
     * getOverworkedAlerts
     * Detects labourers at risk of burnout across the organization.
     */
    async getOverworkedAlerts(orgId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentWork } = await supabase
            .from('work_entries')
            .select('labourer_id, work_done, meters, labourers(name)')
            .eq('organization_id', orgId)
            .gte('date', sevenDaysAgo.toISOString().split('T')[0])
            .eq('is_deleted', false);

        const summary = {};
        (recentWork || []).forEach(w => {
            const id = w.labourer_id;
            if (!summary[id]) summary[id] = { name: w.labourers?.name || 'Worker', total: 0 };
            summary[id].total += Number(w.work_done || w.meters || 0);
        });

        return Object.entries(summary)
            .filter(([id, data]) => data.total > 80) // > 80m in 7 days is high
            .map(([id, data]) => ({
                labourer_id: id,
                name: data.name,
                total_work: data.total,
                risk: 'High Burnout Risk'
            }));
    }
}

module.exports = new EquiFlowService();
