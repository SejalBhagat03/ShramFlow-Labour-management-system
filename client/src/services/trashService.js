/**
 * Service for Recycle Bin operations
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export const trashService = {
    /**
     * Get all trash items
     */
    getTrash: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/trash`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch trash');
        return response.json();
    },

    /**
     * Restore an item
     */
    restore: async (id, token) => {
        const response = await fetch(`${API_BASE_URL}/api/trash/restore/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to restore item');
        return response.json();
    },

    /**
     * Permanently delete an item
     */
    permanentDelete: async (id, token) => {
        const response = await fetch(`${API_BASE_URL}/api/trash/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to delete item permanently');
        return response.json();
    }
};
