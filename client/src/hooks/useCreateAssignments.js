import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * Mutation hook to create multiple work assignments for a given order.
 * accepts { orderId, assignments } where assignments = [ { labour_id, assigned_quantity } ]
 */
export const useCreateAssignments = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, assignments }) => {
            if (!orderId || !assignments || assignments.length === 0) {
                throw new Error('Order ID and at least one assignment are required');
            }

            // Insert each assignment; using bulk insert
            const payload = assignments.map(a => ({
                work_order_id: orderId,
                labour_id: a.labour_id || a.labourer_id, // support old key for compatibility
                assigned_quantity: a.assigned_quantity,
                labour_claim: 0,
                status: 'pending'
            }));

            const { data, error } = await supabase
                .from('work_assignments')
                .insert(payload)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate relevant caches; we don't know orderId here but assignment hook uses dynamic key
            queryClient.invalidateQueries({ queryKey: ['work_assignments'] });
            toast({
                title: 'Assignments Added',
                description: 'Labour has been assigned to the work order.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error creating assignments',
                description: error.message,
                variant: 'destructive'
            });
        }
    });
};
