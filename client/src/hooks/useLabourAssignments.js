import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch assignments either by work order or by labourer.
 *
 * - If you pass { orderId }, it returns assignments for that order (used by supervisor).
 * - If you pass { labourerId }, it returns assignments for that labourer (used by labour).
 *   note: the actual column in the database is `labour_id` so the hook maps it
 *   accordingly when building the query.
 * - If you pass nothing, it will fall back to the current user id as labourer.
 *
 * This single hook keeps the API surface small; the caller is responsible for
 * supplying the appropriate identifier.
 */
export const useLabourAssignments = ({ orderId, labourerId } = {}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const resolvedLabourer = labourerId || (user && user.role === 'labour' ? user.id : null);

    const queryKey = ['work_assignments', orderId || resolvedLabourer];

    const {
        data: assignments = [],
        isLoading,
        error
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!orderId && !resolvedLabourer) return [];

            let builder = supabase.from('work_assignments').select(`
                *,
                labourer:labourers(name),
                work_order:work_orders(work_type, total_quantity, unit)
            `);

            if (orderId) {
                builder = builder.eq('work_order_id', orderId);
            }
            if (resolvedLabourer) {
                // column is named `labour_id` in the database
                builder = builder.eq('labour_id', resolvedLabourer);
            }

            const { data, error } = await builder.order('id', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!orderId || !!resolvedLabourer
    });

    return { assignments, isLoading, error, queryKey };
};
