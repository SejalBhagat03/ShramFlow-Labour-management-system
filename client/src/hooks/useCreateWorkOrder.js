import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Mutation hook to create a new work order. Only supervisors should call this.
 *
 * call mutate({ work_type, total_quantity, unit })
 */
export const useCreateWorkOrder = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ work_type, total_quantity, unit }) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('work_orders')
                .insert({
                    supervisor_id: user.id,
                    work_type,
                    total_quantity,
                    unit,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_orders'] });
            toast({
                title: 'Work Order Created',
                description: 'A new work order has been added to the system.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error creating order',
                description: error.message,
                variant: 'destructive'
            });
        }
    });
};
