import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * Mutation hook for labourers to submit or update their claim on an assignment.
 * Expects { assignmentId, claim } where claim <= assigned_quantity (frontend must enforce).
 */
export const useUpdateLabourClaim = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ assignmentId, claim }) => {
            if (!assignmentId) throw new Error('assignmentId is required');
            if (claim < 0) throw new Error('Claim cannot be negative');

            const { data, error } = await supabase
                .from('work_assignments')
                .update({ labour_claim: claim, status: 'claimed' })
                .eq('id', assignmentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_assignments'] });
            toast({
                title: 'Claim Updated',
                description: 'Your labour has been recorded. Supervisor will review.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error updating claim',
                description: error.message,
                variant: 'destructive'
            });
        }
    });
};
