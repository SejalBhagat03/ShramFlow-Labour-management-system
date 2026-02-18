import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDashboardStats = () => {
    const { user } = useAuth();

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard_stats', user?.id],
        queryFn: async () => {
            if (!user) {
                return {
                    totalLabourers: 0,
                    activeLabourers: 0,
                    todayAttendance: 0,
                    pendingPayments: 0,
                    pendingAmount: 0,
                    flaggedEntries: 0,
                    totalMetersToday: 0,
                    totalHoursToday: 0
                };
            }

            const today = new Date().toISOString().split('T')[0];

            // Fetch all data in parallel
            // Fetch primary data first
            const [labourersRes, workEntriesRes, paymentsRes, flaggedRes, todayWorkRes] = await Promise.all([
                supabase.from('labourers').select('id, status'), // Removed fraud_score to prevent 400 if column missing
                supabase.from('work_entries').select('id, status'),
                supabase.from('payments').select('amount, status').eq('status', 'unpaid'),
                supabase.from('work_entries').select('id').eq('status', 'flagged'),
                supabase.from('work_entries').select('meters, hours').eq('date', today)
            ]);

            // Try to fetch ledger, but don't fail if table missing (404)
            let ledgerRes = { data: [] };
            try {
                const res = await supabase.from('labour_ledger').select('amount, transaction_type');
                if (!res.error) ledgerRes = res;
            } catch (e) {
                console.warn("Ledger fetch failed (migration might be missing):", e);
            }

            const labourers = labourersRes.data || [];
            const payments = paymentsRes.data || [];
            const flagged = flaggedRes.data || [];
            const todayWork = todayWorkRes.data || [];
            const ledger = ledgerRes.data || [];

            const totalLabourers = labourers.length;
            const activeLabourers = labourers.filter(l => l.status === 'active').length;
            const highRiskLabourers = labourers.filter(l => (l.fraud_score || 0) > 50).length;

            const pendingPayments = payments.length;
            // potential pending amount from 'payments' table (scheduled)
            // const pendingAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0); 

            // Real Ledger Balance (Total Payable)
            // Credit (Work) - Debit (Paid)
            const totalWalletBalance = ledger.reduce((acc, curr) => {
                return curr.transaction_type === 'CREDIT'
                    ? acc + Number(curr.amount)
                    : acc - Number(curr.amount);
            }, 0);

            const flaggedEntries = flagged.length;
            const totalMetersToday = todayWork.reduce((sum, w) => sum + (Number(w.meters) || 0), 0);
            const totalHoursToday = todayWork.reduce((sum, w) => sum + (Number(w.hours) || 0), 0);

            // Dispute % could be flagged / total work entries (if we consider flagged as disputed)
            // or we fetch 'disputed' status specifically if needed. 
            // For now using flaggedEntries count.

            return {
                totalLabourers,
                activeLabourers,
                todayAttendance: activeLabourers,
                pendingPayments,
                pendingAmount: totalWalletBalance, // Replacing simple pending amount with true ledger balance
                flaggedEntries,
                totalMetersToday,
                totalHoursToday,
                highRiskLabourers
            };
        },
        enabled: !!user
    });

    return {
        stats: stats || {
            totalLabourers: 0,
            activeLabourers: 0,
            todayAttendance: 0,
            pendingPayments: 0,
            pendingAmount: 0,
            flaggedEntries: 0,
            totalMetersToday: 0,
            totalHoursToday: 0
        },
        isLoading,
        error
    };
};
