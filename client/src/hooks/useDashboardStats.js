import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export const useDashboardStats = () => {
    const { user } = useAuth();

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard_stats', user?.id, user?.organization_id],
        queryFn: async () => {
            const orgId = user?.organization_id;
            const isValidOrg = orgId && orgId !== 'null' && orgId !== 'undefined';

            if (!user || !isValidOrg) {
                if (import.meta.env.DEV && !isValidOrg && orgId) {
                    console.warn('[useDashboardStats] Invalid organization_id:', orgId);
                }
                return {
                    totalLabourers: 0,
                    activeLabourers: 0,
                    todayAttendance: 0,
                    pendingPayments: 0,
                    pendingApprovals: 0,
                    pendingAmount: 0,
                    flaggedEntries: 0,
                    totalMetersToday: 0,
                    totalHoursToday: 0,
                    highRiskLabourers: 0,
                    productivityData: [],
                    topPerformers: [],
                    taskDistribution: []
                };
            }

            const today = new Date().toISOString().split('T')[0];

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Fetch primary data with individual error handling to prevent total failure
            const fetchLabourers = async () => {
                const { data, error } = await supabase
                    .from('labourers')
                    .select('id, name, status, trust_score')
                    .eq('organization_id', user.organization_id);
                if (error) return [];
                return data || [];
            };

            const fetchPayments = async () => {
                const { data, error } = await supabase
                    .from('payments')
                    .select('amount, status')
                    .eq('status', 'unpaid')
                    .eq('organization_id', user.organization_id);
                if (error) return [];
                return data || [];
            };

            const fetchWork = async () => {
                const { data, error } = await supabase.from('work_entries').select(`
                    id, date, meters, hours, amount, task_type, status,
                    labourer:labourers(name)
                `)
                .eq('organization_id', user.organization_id)
                .order('date', { ascending: false })
                .limit(500);

                if (error) return [];
                return data || [];
            };

            const [labourersList, payments, allWork] = await Promise.all([
                fetchLabourers(),
                fetchPayments(),
                fetchWork()
            ]);

            // Try to fetch ledger
            let ledger = [];
            try {
                const { data, error } = await supabase
                    .from('labour_ledger')
                    .select('amount, transaction_type')
                    .eq('organization_id', user.organization_id);
                if (!error) ledger = data || [];
            } catch (e) {
                // Silently fail for ledger if not implemented
            }


            const totalLabourers = labourersList.length;
            const activeLabourers = labourersList.filter(l => l.status === 'active').length;
            const highRiskLabourers = labourersList.filter(l => l.trust_score !== null && l.trust_score < 50).length;

            const pendingPayments = payments.length;

            const totalWalletBalance = ledger.reduce((acc, curr) => {
                return curr.transaction_type === 'CREDIT'
                    ? acc + Number(curr.amount)
                    : acc - Number(curr.amount);
            }, 0);

            const flaggedEntriesCount = allWork.filter(w => w.status === 'rejected' || w.status === 'flagged').length;
            const pendingApprovalsCount = allWork.filter(w => w.status === 'submitted' || w.status === 'pending').length;

            // Calculate today's totals from allWork (only approved work counts for progress)
            const todayEntries = allWork.filter(w =>
                w.date &&
                w.date.toString().substring(0, 10) === today &&
                ['approved', 'paid'].includes(w.status)
            );
            const totalMetersToday = todayEntries.reduce((sum, w) => sum + (Number(w.meters) || 0), 0);
            const totalHoursToday = todayEntries.reduce((sum, w) => sum + (Number(w.hours) || 0), 0);

            // Calculate Productivity Data (Last 7 Days)
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const productivityData = last7Days.map(date => {
                const dayEntries = allWork.filter(w => w.date && w.date.toString().substring(0, 10) === date);
                return {
                    name: format(new Date(date), 'EEE'),
                    meters: dayEntries.reduce((sum, e) => sum + (Number(e.meters) || 0), 0),
                    hours: dayEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0),
                    amount: dayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
                };
            });

            // Calculate Top Performers
            const performanceMap = {};
            allWork.forEach(w => {
                const name = w.labourer?.name || 'Unknown';
                if (!performanceMap[name]) performanceMap[name] = { name, meters: 0, amount: 0 };
                performanceMap[name].meters += (Number(w.meters) || 0);
                performanceMap[name].amount += (Number(w.amount) || 0);
            });
            const topPerformers = Object.values(performanceMap)
                .sort((a, b) => b.meters - a.meters)
                .slice(0, 5);

            // Calculate Task Distribution
            const taskMap = {};
            const colors = ["hsl(173, 80%, 26%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(200, 20%, 50%)"];
            allWork.forEach(w => {
                const type = w.task_type || 'Other';
                if (!taskMap[type]) taskMap[type] = 0;
                taskMap[type]++;
            });
            const taskDistribution = Object.entries(taskMap).map(([name, value], i) => ({
                name,
                value,
                color: colors[i % colors.length]
            }));

            return {
                totalLabourers,
                activeLabourers,
                todayAttendance: activeLabourers,
                pendingPayments,
                pendingApprovals: pendingApprovalsCount,
                pendingAmount: totalWalletBalance,
                flaggedEntries: flaggedEntriesCount,
                totalMetersToday,
                totalHoursToday,
                highRiskLabourers,
                productivityData,
                topPerformers,
                taskDistribution
            };
        },
        enabled: !!user && !!user.organization_id,
        staleTime: 300000, // 5 minutes cache for production
    });

    const defaultStats = {
        totalLabourers: 0,
        activeLabourers: 0,
        todayAttendance: 0,
        pendingPayments: 0,
        pendingAmount: 0,
        flaggedEntries: 0,
        totalMetersToday: 0,
        totalHoursToday: 0,
        highRiskLabourers: 0,
        productivityData: [],
        topPerformers: [],
        taskDistribution: []
    };

    return {
        stats: stats || defaultStats,
        isLoading,
        error
    };
};
