import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { offlineSyncService } from '@/services/offlineSyncService';

export const useLabourers = () => {
    const { user, session } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: labourers = [], isLoading, error } = useQuery({
        queryKey: ['labourers', user?.id],
        queryFn: async () => {
            if (!user) return [];
            if (user.role !== 'supervisor') return [];

            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers`, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch labourers from backend');
                }

                const data = await response.json();
                
                // Cache for offline use
                await offlineSyncService.cacheMetadata('labourers', data);
                return data;
            } catch (err) {
                // If offline, try to get from cache
                if (!navigator.onLine) {
                    const cached = await offlineSyncService.getCachedMetadata('labourers');
                    if (cached) return cached;
                }
                throw err;
            }
        },
        enabled: !!user && !!session
    });

    const createLabourer = useMutation({
        mutationFn: async (formData) => {
            if (!user) throw new Error('Not authenticated');
            if (user.role !== 'supervisor') {
                throw new Error('Only supervisors can add labourers');
            }

            let labourUserId = null;

            // Validate if a password was actually provided (not undefined, null, or empty string)
            const hasPassword = formData.password && formData.password !== 'undefined' && formData.password !== 'null' && formData.password.trim() !== '';

            // Generate email from phone if password is provided (Login enabled)
            let emailToUse = formData.email;
            if (hasPassword && !emailToUse && formData.phone) {
                // Remove non-digits for cleaner username
                const cleanPhone = formData.phone.replace(/\D/g, '');
                emailToUse = `${cleanPhone}@shramflow.com`;
            }

            // If email (or auto-generated email) and password provided, create a user account
            if (emailToUse && hasPassword) {
                // Client-side validation
                if (formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                // Email regex (sanity check on generated email)
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailToUse)) {
                    throw new Error('Invalid email format (or phone number invalid)');
                }

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers/create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        email: emailToUse,
                        password: formData.password,
                        fullName: formData.name,
                        phone: formData.phone,
                        orgId: user.organization_id
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create login account');
                }

                const funcData = await response.json();
                labourUserId = funcData?.userId || null;
            }

            // 2. Create the worker profile in the 'labourers' table via backend
            const profileResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    user_id: labourUserId,
                    name: formData.name,
                    name_hindi: formData.name_hindi || null,
                    phone: formData.phone || null,
                    role: formData.role,
                    daily_rate: formData.daily_rate,
                    rate_per_meter: formData.rate_per_meter || 0,
                    status: formData.status || 'active',
                    location: formData.location || null
                })
            });

            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.error || 'Failed to create worker profile');
            }

            return await profileResponse.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast({
                title: 'Labour Added',
                description: 'New labour has been added to the team.'
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

    const updateLabourer = useMutation({
        mutationFn: async ({ id, ...formData }) => {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update labourer');
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            toast({
                title: 'Labour Updated',
                description: 'Labour details have been updated.'
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

    const deleteLabourer = useMutation({
        mutationFn: async (id) => {
            const token = session?.access_token;
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to delete labourer');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            toast({
                title: 'Labour Removed',
                description: 'Labour has been removed from the team.',
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

    const getLabourBalance = (id) => useQuery({
        queryKey: ['labour_balance', id],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers/${id}/balance`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!response.ok) return 0;
            return await response.json();
        },
        enabled: !!id && !!session
    });

    const getLabourStats = (id) => useQuery({
        queryKey: ['labour_stats', id],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/labourers/${id}/stats`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!response.ok) return { total_earned: 0, total_paid: 0 };
            return await response.json();
        },
        enabled: !!id && !!session
    });

    return {
        labourers,
        isLoading,
        error,
        createLabourer,
        updateLabourer,
        deleteLabourer,
        getLabourBalance,
        getLabourStats
    };
};
