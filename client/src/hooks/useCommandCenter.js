import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

export const useCommandCenter = () => {
    return useQuery({
        queryKey: ['command-center'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}/api/command-center`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch command center data');
            return response.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });
};
