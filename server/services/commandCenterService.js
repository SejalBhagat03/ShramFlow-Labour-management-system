const supabase = require('../config/supabase');
const equiflowService = require('./equiflowService');

/**
 * commandCenterService
 * Logic for generating smart insights, alerts, and actions.
 */
class CommandCenterService {
    async getInsights(orgId, supervisorId) {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Fetch data for analysis
        const [
            { data: projects },
            { data: todayEntries },
            { data: yesterdayEntries },
            { data: approvedUnpaid },
            { data: activities }
        ] = await Promise.all([
            // Live Project data
            supabase.from('projects').select('*').eq('organization_id', orgId).eq('status', 'Ongoing'),
            // Today's Work Entries
            supabase.from('work_entries').select('*, labourer:labourers(*)').eq('organization_id', orgId).eq('date', today),
            // Yesterday's Work Entries (for suggestions)
            supabase.from('work_entries').select('*, labourer:labourers(*)').eq('organization_id', orgId).eq('date', this._getYesterdayDate()),
            // All Approved but Unpaid Entries (for financial stats)
            supabase.from('work_entries').select('amount').eq('organization_id', orgId).eq('status', 'approved').is('payment_id', null),
            // Recent Activities
            supabase.from('activities').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(15)
        ]);

        const totalPending = (approvedUnpaid || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // 2. Generate Actions
        const actions = this._generateActions(projects, todayEntries, yesterdayEntries);

        // 3. Generate Alerts
        const alerts = await this._generateAlerts(projects, todayEntries, orgId);
        
        // 3b. Add Burnout Alerts from EquiFlow
        const burnoutRisks = await equiflowService.getOverworkedAlerts(orgId);
        burnoutRisks.forEach(risk => {
            alerts.push({
                id: `burnout-${risk.labourer_id}`,
                severity: 'warning',
                confidence: 0.95,
                title: 'Burnout Risk',
                message: `${risk.name} has recorded ${risk.total_work}m in 7 days. Consider reducing their load.`,
                labourer_id: risk.labourer_id
            });
        });

        // 4. Project Status
        const projectStatus = this._calculateProjectStatus(projects, todayEntries);

        // 5. Labour Stats
        const labourStats = await this._calculateLabourStats(todayEntries, orgId);

        // 6. Trends & Summary
        const trends = this._calculateTrends(todayEntries, yesterdayEntries);
        const totalWorkToday = todayEntries.reduce((sum, e) => sum + Number(e.meters || e.work_done || 0), 0);
        
        // 7. Weekly Summary (Aggregated)
        const weeklySummary = await this._calculateWeeklySummary(orgId);

        // 8. Undo Window Metadata
        const lastEntry = [...todayEntries].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
        const lastEntryAge = lastEntry ? Math.floor((new Date() - new Date(lastEntry.created_at)) / 1000) : 9999;

        // 9. Final Polish: Suggested Action & Consistency
        const suggestedAction = this._calculateSuggestedAction(actions, alerts);
        const supervisorStats = await this._calculateSupervisorStats(orgId);

        return {
            summary: {
                activeProjects: projects.length,
                workersToday: labourStats.totalToday,
                totalWorkToday,
                alertsCount: alerts.length
            },
            trends,
            lastEntryAge,
            suggestedAction,
            supervisorStats,
            todayActions: actions,
            alerts: alerts,
            projectStatus: projectStatus,
            labourStats: labourStats,
            todayEntries: todayEntries,
            financials: { pendingTotal: totalPending },
            activityFeed: activities || [],
            weeklySummary
        };
    }

    _generateActions(projects = [], todayEntries = [], yesterdayEntries = []) {
        const actions = [];
        const projectsWithEntryToday = new Set(todayEntries.map(e => e.project_id));

        projects.forEach(project => {
            // Action: Missing Work Entry Today
            if (!projectsWithEntryToday.has(project.id)) {
                actions.push({
                    id: `record-work-${project.id}`,
                    type: 'primary',
                    title: `Record Work: ${project.name}`,
                    description: `No work entry found for today at ${project.site_location || 'this site'}.`,
                    actionUrl: `/work-entries?project_id=${project.id}`,
                    icon: 'Plus'
                });
            }

            // Action: Suggest Continue Yesterday
            const yesterdayWorkersForProject = yesterdayEntries.filter(e => e.project_id === project.id);
            if (!projectsWithEntryToday.has(project.id) && yesterdayWorkersForProject.length > 0) {
                actions.push({
                    id: `continue-yesterday-${project.id}`,
                    type: 'suggestion',
                    title: `Continue Yesterday: ${project.name}`,
                    description: `5 labourers worked here yesterday. Copy list and resume?`,
                    actionUrl: `/group-work-entry?project_id=${project.id}&source=yesterday`,
                    icon: 'ClipboardList'
                });
            }
        });

        return actions;
    }

    async _generateAlerts(projects = [], todayEntries = [], orgId) {
        const alerts = [];
        const today = new Date();

        for (const project of projects) {
            // Alert: Deadline Near
            if (project.end_date) {
                const endDate = new Date(project.end_date);
                const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 3 && diffDays >= 0) {
                    alerts.push({
                        id: `deadline-${project.id}`,
                        severity: 'warning',
                        confidence: 1.0,
                        title: 'Upcoming Deadline',
                        message: `${project.name} is scheduled to end in ${diffDays} days.`,
                        project_id: project.id
                    });
                } else if (diffDays < 0) {
                    alerts.push({
                        id: `delayed-${project.id}`,
                        severity: 'critical',
                        confidence: 1.0,
                        title: 'Project Overdue',
                        message: `${project.name} has exceeded its estimated end date.`,
                        project_id: project.id
                    });
                }
            }

            // Alert: Target Exceeded
            if (project.total_work_done > project.total_work_target && project.total_work_target > 0) {
                alerts.push({
                    id: `target-exceeded-${project.id}`,
                    severity: 'critical',
                    confidence: 1.0,
                    title: 'Work Exceeds Target',
                    message: `${project.name} has recorded ${project.total_work_done} units, exceeding target of ${project.total_work_target}.`,
                    project_id: project.id
                });
            }

            // Alert: Inactivity
            if (project.last_entry_date) {
                const lastDate = new Date(project.last_entry_date);
                const diff = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
                if (diff >= 2) {
                    alerts.push({
                        id: `inactivity-${project.id}`,
                        severity: 'info',
                        confidence: 0.9,
                        title: 'Site Inactivity',
                        message: `No work recorded for ${project.name} in the last ${diff} days.`,
                        project_id: project.id
                    });
                }
            }
        }

        // Alert: Labour Conflict
        const labourAssignments = {}; // { labourId: [projectIds] }
        todayEntries.forEach(e => {
            if (!labourAssignments[e.labourer_id]) labourAssignments[e.labourer_id] = [];
            labourAssignments[e.labourer_id].push(e.project_id);
        });

        Object.entries(labourAssignments).forEach(([labourId, projectIds]) => {
            const uniqueProjects = [...new Set(projectIds)];
            if (uniqueProjects.length > 1) {
                const labour = todayEntries.find(e => e.labourer_id === labourId)?.labourer;
                alerts.push({
                    id: `conflict-${labourId}`,
                    severity: 'warning',
                    confidence: 0.85,
                    title: 'Labour Conflict',
                    message: `${labour?.name || 'Labourer'} recorded work at ${uniqueProjects.length} different sites today.`,
                });
            }
        });

        // Alert: High Work Anomaly
        const avgWork = 10; // Ideally fetch from history
        todayEntries.forEach(e => {
            const work = Number(e.meters || e.work_done || 0);
            if (work > 15) {
                alerts.push({
                    id: `anomaly-${e.id}`,
                    severity: 'warning',
                    confidence: 0.7,
                    title: 'High Work Entry',
                    message: `${e.labourer?.name} recorded ${work}m today. This exceeds the 15m safety threshold by ${Math.round(((work/15)-1)*100)}%.`,
                });
            } else if (work > avgWork * 1.5) {
                alerts.push({
                    id: `anomaly-avg-${e.id}`,
                    severity: 'warning',
                    confidence: 0.7,
                    title: 'Work Anomaly',
                    message: `${e.labourer?.name} recorded ${work}m, which is ${(work/avgWork).toFixed(1)}x their usual average.`,
                });
            }
        });

        return alerts;
    }

    _calculateProjectStatus(projects = [], todayEntries = []) {
        return projects.map(p => {
            const siteEntries = todayEntries.filter(e => e.project_id === p.id);
            return {
                id: p.id,
                name: p.name,
                progress: p.progress_percent || 0,
                activeLabour: siteEntries.length,
                active_labourers: siteEntries.map(e => ({
                    id: e.labourer?.id,
                    name: e.labourer?.name,
                    role: e.labourer?.trade || e.labourer?.role || 'Worker'
                })),
                status: p.status,
                health: p.health_status,
                efficiency: this._calculateEfficiency(p)
            };
        });
    }

    _calculateEfficiency(project) {
        // Simple logic: Work Done / Days since start
        if (!project.start_date || !project.total_work_done) return 'N/A';
        const start = new Date(project.start_date);
        const days = Math.ceil((new Date() - start) / (1000 * 60 * 60 * 24)) || 1;
        return (project.total_work_done / days).toFixed(1);
    }

    async _calculateLabourStats(todayEntries = [], orgId) {
        const workers = new Set(todayEntries.map(e => e.labourer_id)).size;
        
        let topEarner = { name: 'None', amount: 0 };
        const earnings = {};
        todayEntries.forEach(e => {
            earnings[e.labourer_id] = (earnings[e.labourer_id] || 0) + (Number(e.amount) || 0);
        });

        const topId = Object.keys(earnings).reduce((a, b) => earnings[a] > earnings[b] ? a : b, null);
        if (topId) {
            topEarner = {
                name: todayEntries.find(e => e.labourer_id === topId)?.labourer?.name || 'Labourer',
                amount: earnings[topId]
            };
        }

        // Fetch top debts (labourers with pending balance)
        // For efficiency in a real app, this should be a view or cached sum.
        // For now, we'll fetch labourers and their balances.
        const { data: labourers } = await supabase
            .from('labourers')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('is_deleted', false);

        const topDebts = [];
        if (labourers) {
            // We use a simplified calculation for the dashboard
            const { data: allWork } = await supabase.from('work_entries').select('labourer_id, amount').eq('organization_id', orgId).in('status', ['approved', 'paid']);
            const { data: allPay } = await supabase.from('payments').select('labourer_id, amount').eq('organization_id', orgId).eq('status', 'paid');

            labourers.forEach(l => {
                const earned = (allWork || []).filter(w => w.labourer_id === l.id).reduce((s, w) => s + Number(w.amount), 0);
                const paid = (allPay || []).filter(p => p.labourer_id === l.id).reduce((s, p) => s + Number(p.amount), 0);
                const balance = earned - paid;
                if (balance > 0) {
                    topDebts.push({ name: l.name, balance });
                }
            });
        }

        return {
            totalToday: workers,
            absentEstimated: 0, 
            topEarner: topEarner,
            topDebts: topDebts.sort((a,b) => b.balance - a.balance).slice(0, 5)
        };
    }

    _getYesterdayDate() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }

    _calculateTrends(todayEntries = [], yesterdayEntries = []) {
        const todayVol = todayEntries.reduce((sum, e) => sum + Number(e.meters || e.work_done || 0), 0);
        const yesterVol = yesterdayEntries.reduce((sum, e) => sum + Number(e.meters || e.work_done || 0), 0);

        let change = 0;
        if (yesterVol > 0) {
            change = ((todayVol - yesterVol) / yesterVol) * 100;
        }

        return {
            todayTotal: todayVol,
            yesterdayTotal: yesterVol,
            changePercent: Math.round(change),
            direction: todayVol >= yesterVol ? 'up' : 'down'
        };
    }

    async _calculateWeeklySummary(orgId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data: entries } = await supabase
            .from('work_entries')
            .select('*, project:projects(name)')
            .eq('organization_id', orgId)
            .gte('date', startDate)
            .eq('is_deleted', false);

        if (!entries || entries.length === 0) return { totalWork: 0, totalPayments: 0, bestProject: 'None', period: 'Last 7 Days', weeklyTrend: [] };

        const totalWork = entries.reduce((sum, e) => sum + Number(e.meters || e.work_done || 0), 0);
        const totalPayments = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Daily Trend Aggregation
        const trendMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            trendMap[dateStr] = { day: label, work: 0 };
        }

        entries.forEach(e => {
            if (trendMap[e.date]) {
                trendMap[e.date].work += Number(e.meters || e.work_done || 0);
            }
        });

        const weeklyTrend = Object.values(trendMap).reverse();

        // Find Best Project
        const projectWork = {};
        entries.forEach(e => {
            const name = e.project?.name || 'Unknown';
            projectWork[name] = (projectWork[name] || 0) + Number(e.meters || e.work_done || 0);
        });

        const bestProjectName = Object.keys(projectWork).reduce((a, b) => projectWork[a] > projectWork[b] ? a : b, 'None');

        return {
            totalWork,
            totalPayments,
            bestProject: bestProjectName,
            period: 'Last 7 Days',
            rawEntries: entries,
            weeklyTrend
        };
    }

    _calculateSuggestedAction(actions = [], alerts = []) {
        const criticalAlert = alerts.find(a => a.severity === 'critical');
        if (criticalAlert) {
            return {
                type: 'critical',
                message: `URGENT: ${criticalAlert.title} - ${criticalAlert.message}`,
                projectId: criticalAlert.project_id,
                cta: 'Resolve Now'
            };
        }

        const missingWork = actions.find(a => a.id.startsWith('record-work'));
        if (missingWork) {
            return {
                type: 'primary',
                message: `Suggested: ${missingWork.title}`,
                projectId: missingWork.project_id,
                cta: 'Add Entry'
            };
        }

        const warningAlert = alerts.find(a => a.severity === 'warning');
        if (warningAlert) {
            return {
                type: 'warning',
                message: `Review: ${warningAlert.title}`,
                projectId: warningAlert.project_id,
                cta: 'Check Site'
            };
        }

        const suggestion = actions.find(a => a.type === 'suggestion');
        if (suggestion) {
            return {
                type: 'info',
                message: suggestion.title,
                projectId: suggestion.project_id,
                cta: 'Clone List'
            };
        }

        return {
            type: 'success',
            message: 'All systems normal. You are on track!',
            cta: 'View Dashboard'
        };
    }

    async _calculateSupervisorStats(orgId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data: entries } = await supabase
            .from('work_entries')
            .select('date')
            .eq('organization_id', orgId)
            .gte('date', startDate)
            .eq('is_deleted', false);

        const activeDays = new Set((entries || []).map(e => e.date)).size;
        const consistency = Math.round((activeDays / 7) * 100);

        let tier = 'Needs Attention';
        if (consistency >= 90) tier = 'Excellent';
        else if (consistency >= 70) tier = 'Good';

        return {
            consistency,
            tier,
            activeDays
        };
    }
}

module.exports = new CommandCenterService();
