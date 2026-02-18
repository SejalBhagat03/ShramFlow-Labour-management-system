import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useActivities = (limit = 10) => {
    const { user } = useAuth();

    const { data: activities = [], isLoading, error } = useQuery({
        queryKey: ['activities', user?.id, limit],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    return {
        activities,
        isLoading,
        error
    };
};
