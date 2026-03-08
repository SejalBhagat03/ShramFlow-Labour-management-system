import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useLabourers = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: labourers = [], isLoading, error } = useQuery({
        queryKey: ['labourers', user?.id],
        queryFn: async () => {
            if (!user) return [];
            // only supervisors/admins should ever fetch the full list
            if (user.role !== 'supervisor') {
                // return empty array rather than letting RLS 400
                return [];
            }

            const { data, error } = await supabase
                .from('labourers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const createLabourer = useMutation({
        mutationFn: async (formData) => {
            if (!user) throw new Error('Not authenticated');
            if (user.role !== 'supervisor') {
                throw new Error('Only supervisors can add labourers');
            }

            let labourUserId = null;

            // Generate email from phone if password is provided (Login enabled)
            let emailToUse = formData.email;
            if (formData.password && !emailToUse && formData.phone) {
                // Remove non-digits for cleaner username
                const cleanPhone = formData.phone.replace(/\D/g, '');
                emailToUse = `${cleanPhone}@shramflow.com`;
                emailToUse = `${cleanPhone}@shramflow.com`;
            }

            // If email (or auto-generated email) and password provided, create a user account
            if (emailToUse && formData.password) {
                // Client-side validation
                if (formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                // Email regex (sanity check on generated email)
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailToUse)) {
                    throw new Error('Invalid email format (or phone number invalid)');
                }

                const { data: funcData, error: funcError } = await supabase.functions.invoke('create-labour-user', {
                    body: {
                        email: emailToUse,
                        password: formData.password,
                        fullName: formData.name,
                        phone: formData.phone
                    }
                });

                if (funcError) {
                    let errorMessage = funcError.message || "Unknown error";

                    if (funcError.context && funcError.context.json) {
                        // Check if the parsed JSON body is available in context (some client versions)
                        const body = await funcError.context.json();
                        if (body && body.error) errorMessage = body.error;
                    } else if (funcError.context && funcError.context.error) {
                        // Sometimes the error is nested in context
                        errorMessage = funcError.context.error;
                    } else if (typeof funcError === 'object' && funcError.error) {
                        // Direct error object
                        errorMessage = funcError.error;
                    } else if (typeof funcError === 'string') {
                        try {
                            const parsed = JSON.parse(funcError);
                            errorMessage = parsed.error || funcError;
                        } catch (e) {
                            errorMessage = funcError;
                        }
                    }

                    throw new Error(`Login creation failed: ${errorMessage}`);
                }
                labourUserId = funcData?.userId || null;
            }

            const { data, error } = await supabase
                .from('labourers')
                .insert({
                    supervisor_id: user.id,
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
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { data, error } = await supabase
                .from('labourers')
                .update({
                    name: formData.name,
                    name_hindi: formData.name_hindi || null,
                    phone: formData.phone || null,
                    role: formData.role,
                    daily_rate: formData.daily_rate,
                    rate_per_meter: formData.rate_per_meter || 0,
                    status: formData.status || 'active',
                    location: formData.location || null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { error } = await supabase
                .from('labourers')
                .delete()
                .eq('id', id);

            if (error) throw error;
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

    return {
        labourers,
        isLoading,
        error,
        createLabourer,
        updateLabourer,
        deleteLabourer,
        getLabourBalance: async (labourId) => {
            const { data, error } = await supabase.rpc('get_labour_balance', { labour_uuid: labourId });
            if (error) throw error;
            return data;
        },
        getLabourStats: async (labourId) => {
            const { data, error } = await supabase.rpc('get_labour_stats', { labour_uuid: labourId });
            if (error) throw error;
            return data;
        }
    };
};
