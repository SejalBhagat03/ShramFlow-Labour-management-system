import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useWorkEntries = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: workEntries = [], isLoading, error } = useQuery({
        queryKey: ['work_entries', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('work_entries')
                .select(`
          *,
          labourer:labourers(name, name_hindi)
        `)
                .order('date', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const createWorkEntry = useMutation({
        mutationFn: async (formData) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('work_entries')
                .insert({
                    supervisor_id: user.id,
                    labourer_id: formData.labourer_id,
                    date: formData.date,
                    task_type: formData.task_type,
                    meters: formData.meters || null,
                    hours: formData.hours || null,
                    amount: formData.amount,
                    location: formData.location || null,
                    description: formData.description || null,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Add activity
            await supabase.from('activities').insert({
                supervisor_id: user.id,
                type: 'work',
                message: `Work entry added: ${formData.task_type}`,
                message_hindi: `काम दर्ज किया गया: ${formData.task_type}`,
                icon: '📋'
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work_entries'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            toast({
                title: 'Work Entry Added',
                description: 'The work entry has been saved successfully.'
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
            const { data, error } = await supabase
                .from('work_entries')
                .update({ status: 'approved' })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { data, error } = await supabase
                .from('work_entries')
                .update({ status: 'approved' })
                .in('id', ids)
                .select();

            if (error) throw error;
            return data;
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
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('work_entries')
                .update({ status: 'flagged', flag_reason: reason })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Add activity for flagging
            await supabase.from('activities').insert({
                supervisor_id: user.id,
                type: 'flag',
                message: `Work entry flagged: ${reason}`,
                message_hindi: `काम प्रविष्टि चिह्नित: ${reason}`,
                icon: '⚠️'
            });

            return data;
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

    return {
        workEntries,
        isLoading,
        error,
        createWorkEntry,
        approveWorkEntry,
        approveBulkWorkEntries,
        flagWorkEntry
    };
};
