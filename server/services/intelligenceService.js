const supabase = require('../config/supabase');

/**
 * IntelligenceService
 * Predictive analytics and business intelligence logic for ShramFlow.
 */
class IntelligenceService {
    /**
     * Calculates project health, predicted end date, and manpower recommendations.
     */
    async getProjectHealth(projectId) {
        // 1. Fetch Project Details
        const { data: project, error: pError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (pError || !project) throw new Error('Project not found');

        // 2. Fetch Recent Work History (Last 14 days) for Velocity
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: history } = await supabase
            .from('work_entries')
            .select('date, meters, labourer_id')
            .eq('project_id', projectId)
            .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
            .eq('status', 'approved');

        // 3. Calculate Velocity (Avg Units per Day)
        const dailyTotals = {};
        const labourerDays = new Set(); // To calculate avg work per person

        history?.forEach(entry => {
            dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + Number(entry.meters || 0);
            labourerDays.add(`${entry.date}-${entry.labourer_id}`);
        });

        const activeDaysCount = Object.keys(dailyTotals).length || 1;
        const totalWorkInPeriod = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
        const avgDailyVelocity = totalWorkInPeriod / activeDaysCount;
        
        const avgWorkPerPersonPerDay = labourerDays.size > 0 
            ? totalWorkInPeriod / labourerDays.size 
            : 10; // Fallback to 10 units/day

        // 4. Prediction Logic
        const remainingWork = Math.max(0, (project.total_work_target || 0) - (project.total_work_done || 0));
        const daysToComplete = avgDailyVelocity > 0 ? remainingWork / avgDailyVelocity : Infinity;

        const today = new Date();
        const deadline = project.end_date ? new Date(project.end_date) : null;
        const daysUntilDeadline = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;

        // 5. Health Assessment
        let healthStatus = 'Healthy';
        let recommendation = 'Maintain current pace.';
        let riskLevel = 'low';

        if (daysUntilDeadline !== null) {
            if (daysToComplete > daysUntilDeadline) {
                healthStatus = 'At Risk';
                riskLevel = 'high';
                const requiredVelocity = remainingWork / daysUntilDeadline;
                const additionalManpower = Math.ceil((requiredVelocity - avgDailyVelocity) / avgWorkPerPersonPerDay);
                recommendation = `Add ${additionalManpower > 0 ? additionalManpower : 1} more labourers to meet the deadline.`;
            } else if (daysToComplete > daysUntilDeadline * 0.8) {
                healthStatus = 'Borderline';
                riskLevel = 'medium';
                recommendation = 'Consider increasing daily targets slightly.';
            }
        }

        const predictedEndDate = new Date();
        predictedEndDate.setDate(predictedEndDate.getDate() + (isFinite(daysToComplete) ? daysToComplete : 0));

        return {
            projectId,
            metrics: {
                avgDailyVelocity: avgDailyVelocity.toFixed(1),
                remainingWork,
                daysToComplete: isFinite(daysToComplete) ? Math.ceil(daysToComplete) : 'N/A',
                avgWorkPerPersonPerDay: avgWorkPerPersonPerDay.toFixed(1)
            },
            prediction: {
                healthStatus,
                riskLevel,
                predictedEndDate: isFinite(daysToComplete) ? predictedEndDate.toISOString().split('T')[0] : 'Unknown',
                isOverdue: daysUntilDeadline !== null && daysUntilDeadline < 0,
                daysDifference: daysUntilDeadline !== null ? Math.ceil(daysToComplete - daysUntilDeadline) : 0
            },
            recommendation
        };
    }
}

module.exports = new IntelligenceService();
