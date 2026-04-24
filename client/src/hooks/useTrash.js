import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trashService } from '@/services/trashService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useTrash = () => {
    const { session } = useAuth();
    const token = session?.access_token;
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: trashItems = [], isLoading, error } = useQuery({
        queryKey: ['trash', token],
        queryFn: () => trashService.getTrash(token),
        enabled: !!token
    });

    const restoreItem = useMutation({
        mutationFn: (id) => trashService.restore(id, token),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
            queryClient.invalidateQueries({ queryKey: ['work'] });
            toast({
                title: 'Restored',
                description: data.message
            });
        },
        onError: (error) => {
            toast({
                title: 'Restore Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const permanentDelete = useMutation({
        mutationFn: (id) => trashService.permanentDelete(id, token),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast({
                title: 'Deleted Permanently',
                description: data.message,
                variant: 'destructive'
            });
        },
        onError: (error) => {
            toast({
                title: 'Delete Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    return {
        trashItems,
        isLoading,
        error,
        restoreItem,
        permanentDelete
    };
};
