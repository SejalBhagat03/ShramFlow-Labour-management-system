import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

export const projectService = {
    async getProjects() {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_BASE}/api/projects`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!response.ok) return [];
        return await response.json();
    },

    async createProject(projectData) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });
        if (!response.ok) throw new Error("Failed to create project");
        return await response.json();
    },

    async getProjectById(id) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_BASE}/api/projects/${id}`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch project details");
        return await response.json();
    }
};
