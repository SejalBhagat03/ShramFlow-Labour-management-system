import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * Mutation hook for supervisors to confirm that claimed work is acceptable.
 * This sets status to 'confirmed' on the assignment.  It does NOT modify quantities.
 */
export const useConfirmWork = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId) => {
            if (!assignmentId) throw new Error('assignmentId is required');
            const { data, error } = await supabase
                .from('work_assignments')
                .update({ status: 'confirmed' })
                .eq('id', assignmentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_assignments'] });
            toast({
                title: 'Work Confirmed',
                description: 'Labour work has been confirmed.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error confirming work',
                description: error.message,
                variant: 'destructive'
            });
        }
    });
};
