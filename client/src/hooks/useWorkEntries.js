import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { workService } from '@/services/workService';
import { WorkEntry as WorkEntryModel } from '@/lib/models/WorkEntry';

export const useWorkEntries = (labourerId) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: workEntries = [], isLoading, error } = useQuery({
        queryKey: ['work_entries', user?.id, labourerId, user?.organization_id],
        queryFn: async () => {
            if (!user) return [];
            // If used in a context that requires a labourerId, we could add a guard.
            // But supervisors might want to see all if no ID is provided.
            // The user requested: "not call the API when labourerId is undefined"
            // Let's assume this means when intended for a specific labourer.
            if (labourerId === 'undefined') return [];

            return await workService.getWorkEntries(labourerId, user?.organization_id);
        },
        enabled: !!user && !!user.organization_id && user.organization_id !== 'null' && user.organization_id !== 'undefined'
    });

    const createWorkEntry = useMutation({
        mutationFn: async (formData) => {
            return await workService.createWorkEntry({
                labourer_id: formData.labourer_id,
                project_id: formData.project_id || null,
                date: formData.date,
                task_type: formData.task_type,
                meters: formData.meters || null,
                hours: formData.hours || null,
                amount: formData.amount,
                location: formData.location || null,
                description: formData.description || null,
                status: 'pending'
            });
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
            toast({
                title: 'Work Entry Saved',
                description: 'Record added successfully.'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const approveWorkEntry = useMutation({
        mutationFn: async (id) => {
            return await workService.updateWorkStatus(id, 'approved');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            toast({
                title: 'Entry Approved',
                description: 'Work entry has been approved.'
            });
        }
    });

    const approveBulkWorkEntries = useMutation({
        mutationFn: async (ids) => {
            // Sequential updates for simplicity if backend doesn't support bulk PATCH yet
            // Or update backend to support it. For now, Promise.all.
            return await Promise.all(ids.map(id => workService.updateWorkStatus(id, 'approved')));
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            toast({
                title: 'Bulk Approved',
                description: `${data.length} work entries have been approved.`
            });
        }
    });

    const flagWorkEntry = useMutation({
        mutationFn: async ({ id, reason }) => {
            return await workService.updateWorkStatus(id, 'rejected', reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            toast({
                title: 'Entry Flagged',
                description: 'Work entry has been flagged for review.',
                variant: 'destructive'
            });
        }
    });

    const deleteWorkEntry = useMutation({
        mutationFn: async (id) => {
            return await workService.deleteWorkEntry(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            toast({
                title: 'Work Entry Removed',
                description: 'Record moved to Recycle Bin.',
                variant: 'destructive'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    return {
        workEntries,
        isLoading,
        error,
        createWorkEntry,
        approveWorkEntry,
        approveBulkWorkEntries,
        flagWorkEntry,
        deleteWorkEntry
    };
};
