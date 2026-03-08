import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch work orders belonging to the current supervisor.
 * Returns list, loading state and error.
 */
export const useWorkOrders = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        data: workOrders = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['work_orders', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .eq('supervisor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    return { workOrders, isLoading, error };
};
