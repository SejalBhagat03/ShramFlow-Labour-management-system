import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/projectService';
import { offlineSyncService } from '@/services/offlineSyncService';

export const useProjects = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: projects = [], isLoading, error } = useQuery({
        queryKey: ['projects', user?.id, user?.organization_id],
        queryFn: async () => {
            if (!user) return [];
            
            try {
                const data = await projectService.getProjects();
                
                // Cache for offline use
                await offlineSyncService.cacheMetadata('projects', data);
                return data;
            } catch (err) {
                // If offline, try to get from cache
                if (!navigator.onLine) {
                    const cached = await offlineSyncService.getCachedMetadata('projects');
                    if (cached) {
                        console.log("Using cached projects (offline)");
                        return cached;
                    }
                }
                throw err;
            }
        },
        enabled: !!user && !!user.organization_id
    });

    const createProject = useMutation({
        mutationFn: (data) => projectService.createProject(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast({ title: "Project Created", description: "New project added successfully." });
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    return {
        projects,
        isLoading,
        error,
        createProject
    };
};
