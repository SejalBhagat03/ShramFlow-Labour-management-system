import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';



export const useLabourLedger = (labourId) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['labour_ledger', labourId],
        queryFn: async () => {
            if (!user || !labourId) return null;

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/labour/${labourId}/ledger`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch ledger');
            }

            return await response.json();
        },
        enabled: !!user && !!labourId
    });
};
