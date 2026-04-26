import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE } from '@/lib/api';

/**
 * useDashboardInsights
 * Fetches consolidated insights for the supervisor dashboard.
 */
export const useDashboardInsights = () => {
    const { user, session } = useAuth();

    return useQuery({
        queryKey: ['dashboard_insights', user?.id, user?.organization_id],
        queryFn: async () => {
            if (!user || !session) return null;

            const response = await fetch(`${API_BASE}/api/command-center`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard insights');
            }

            return await response.json();
        },
        enabled: !!user && !!session,
        refetchInterval: 30000 // Refetch every 30 seconds for live-ish data
    });
};
