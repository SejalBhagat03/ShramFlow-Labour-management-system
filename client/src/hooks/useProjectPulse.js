import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

/**
 * useProjectPulse
 * Fetches real-time status of all projects (budget, active workers).
 */
export const useProjectPulse = () => {
    return useQuery({
        queryKey: ['project_pulse'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/projects/pulse`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch pulse data');
            }

            return await response.json();
        },
        refetchInterval: 30000, // Poll every 30s for the Command Center
    });
};
