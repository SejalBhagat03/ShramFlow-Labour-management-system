const ROLE_WEIGHTS = {
    'Lead': 1.5,
    'Electrician': 1.4,
    'Fitter': 1.3,
    'Helper': 1.0,
    'Trainee': 0.8
};

/**
 * EquiFlow Service
 * Intelligent labor distribution algorithm.
 */
class EquiFlowService {
    /**
     * calculateSmartDistribution
     * Returns suggested work shares for a group of labourers based on performance, skill, and manual weights.
     */
    async calculateSmartDistribution(labourIds, totalQuantity, orgId, manualWeights = {}) {
        if (!labourIds || labourIds.length === 0) return [];

        // 1. Fetch historical performance AND roles for these labourers
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [historyRes, labourDetailsRes] = await Promise.all([
            supabase
                .from('work_entries')
                .select('labourer_id, work_done, meters, date')
                .in('labourer_id', labourIds)
                .eq('organization_id', orgId)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .eq('is_deleted', false),
            supabase
                .from('labourers')
                .select('id, role, name')
                .in('id', labourIds)
        ]);

        const history = historyRes.data || [];
        const labourDetails = labourDetailsRes.data || [];

        // 2. Process metrics per labourer
        const stats = {};
        labourIds.forEach(id => {
            const detail = labourDetails.find(l => l.id === id);
            stats[id] = {
                name: detail?.name || 'Worker',
                role: detail?.role || 'Helper',
                totalWork: 0,
                daysActive: 0,
                velocity: 1, 
                recentLoad: 0, 
                burnoutRisk: 0
            };
        });

        const today = new Date();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(today.getDate() - 3);

        history.forEach(entry => {
            const val = Number(entry.work_done || entry.meters || 0);
            const entryDate = new Date(entry.date);
            
            if (stats[entry.labourer_id]) {
                stats[entry.labourer_id].totalWork += val;
                stats[entry.labourer_id].daysActive += 1;

                if (entryDate >= threeDaysAgo) {
                    stats[entry.labourer_id].recentLoad += val;
                }
            }
        });

        // 3. Calculate Weightage
        let totalWeight = 0;
        const weights = {};

        labourIds.forEach(id => {
            const s = stats[id];
            
            // Skill Weight (based on Role)
            const skillWeight = ROLE_WEIGHTS[s.role] || 1.0;
            
            // Performance Metric (Velocity)
            const avgVelocity = s.daysActive > 0 ? (s.totalWork / s.daysActive) : 5;
            
            // Burnout Penalty
            const burnoutPenalty = s.recentLoad > 40 ? 0.7 : 1.0;
            
            // Manual Override (if provided)
            const manualWeight = manualWeights[id] || 1.0;

            // Final Calculation: Skill * Performance * Burnout * Manual
            const finalWeight = skillWeight * avgVelocity * burnoutPenalty * manualWeight;
            
            weights[id] = finalWeight;
            totalWeight += finalWeight;
        });

        // 4. Final Allocation
        return labourIds.map(id => {
            const share = (weights[id] / totalWeight) * totalQuantity;
            const s = stats[id];
            return {
                labourer_id: id,
                name: s.name,
                role: s.role,
                suggested_quantity: Math.round(share * 100) / 100,
                metrics: {
                    skill_multiplier: (ROLE_WEIGHTS[s.role] || 1.0).toFixed(1),
                    avg_velocity: (s.daysActive > 0 ? (s.totalWork / s.daysActive) : 5).toFixed(1),
                    burnout_risk: s.recentLoad > 40 ? 'High' : 'Low'
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
