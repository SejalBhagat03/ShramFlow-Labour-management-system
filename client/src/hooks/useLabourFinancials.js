import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

/**
 * useLabourFinancials
 * Fetches financial summary (balance, totals) for the logged-in labourer.
 */
export const useLabourFinancials = () => {
    const { user, session } = useAuth();

    return useQuery({
        queryKey: ['labour_financials', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // 1. Resolve labourer_id from auth user_id
            const { data: labourer, error: lError } = await supabase
                .from('labourers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (lError || !labourer) {
                console.warn("No labourer record found for this user");
                return null;
            }

            // 2. Fetch ledger from backend API
            const token = session?.access_token;
            const response = await fetch(`${API_BASE}/api/labourers/${labourer.id}/ledger`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch financial data');
            }

            return await response.json();
        },
        enabled: !!user && user.role === 'labour'
    });
};
