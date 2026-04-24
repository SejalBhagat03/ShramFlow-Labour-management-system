import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const useActivities = (limit = 10) => {
    const { user } = useAuth();

    const { data: activities = [], isLoading, error } = useQuery({
        queryKey: ['activities', user?.id, user?.organization_id, limit],
        queryFn: async () => {
            const orgId = user?.organization_id;
            const isValidOrg = orgId && orgId !== 'null' && orgId !== 'undefined';

            if (!user || !isValidOrg) return [];

            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!user.organization_id && user.organization_id !== 'null' && user.organization_id !== 'undefined'
    });

    return {
        activities,
        isLoading,
        error
    };
};
