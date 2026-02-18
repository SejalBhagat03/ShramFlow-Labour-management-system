import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { workService } from '@/services/workService';

/**
 * Hook for labourers to manage their claims
 * @param {string} labourerId
 */
export const useMyWorkClaims = (labourerId) => {
    return useQuery({
        queryKey: ['my_work_claims', labourerId],
        queryFn: async () => {
            if (!labourerId) return [];
            // This service method needs to be implemented or we use the direct supabase call if not ready yet
            // For now, let's keep the direct logic if service isn't fully robust, or switch to service.
            // Based on plan, we switch to service.
            // NOTE: workService.getWorkEntries returns WorkEntry objects.
            return workService.getWorkEntries(labourerId);
        },
        enabled: !!labourerId
    });
};

/**
 * Hook for today's claim
 * @param {string} labourerId
 */
export const useTodayClaim = (labourerId) => {
    const today = new Date().toISOString().split('T')[0];
    return useQuery({
        queryKey: ['today_claim', labourerId, today],
        queryFn: async () => {
            // We might need to add getTodayClaim to workService
            if (!labourerId) return null;
            // Fallback to service or direct call. 
            // Implementing logic via service would be cleaner.
            const entries = await workService.getWorkEntries(labourerId);
            return entries.find(e => e.date === today) || null;
        },
        enabled: !!labourerId
    });
};

/**
 * Hook to submit a work claim
 */
export const useSubmitWorkClaim = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (claim) => {
            return workService.createWorkEntry(claim);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my_work_claims'] });
            queryClient.invalidateQueries({ queryKey: ['today_claim'] });
            queryClient.invalidateQueries({ queryKey: ['work_claims'] });
            toast({
                title: 'Work claim submitted',
                description: 'Your work claim has been recorded successfully.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Error submitting claim',
                description: error.message,
                variant: 'destructive',
            });
        }
    });
};

/**
 * Hook for work acknowledgments
 * @param {string} labourerId
 */
export const useMyAcknowledgments = (labourerId) => {
    return useQuery({
        queryKey: ['my_acknowledgments', labourerId],
        queryFn: async () => {
            if (!labourerId) return [];
            return workService.getPendingAcknowledgments(labourerId);
        },
        enabled: !!labourerId
    });
};

/**
 * Hook to acknowledge or dispute an entry
 */
export const useAcknowledgeWork = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ acknowledgmentId, status, disputeReason }) => {
            return workService.acknowledgeWork(acknowledgmentId, status, disputeReason);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['my_acknowledgments'] });
            queryClient.invalidateQueries({ queryKey: ['labourer_trust'] });
            toast({
                title: variables.status === 'confirmed' ? 'Work confirmed' : 'Dispute raised',
                description: variables.status === 'confirmed'
                    ? 'You have confirmed the supervisor\'s entry. Trust score increased!'
                    : 'Your dispute has been recorded.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    });
};
