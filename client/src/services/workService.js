import { supabase } from '@/lib/supabase';
import { WorkEntry } from '@/lib/models/WorkEntry';
import { API_BASE } from '@/lib/api';

/**
 * WorkService
 * Handles work entries, disputes, and related data.
 */
export const workService = {
    /**
     * Fetch work entries for a specific labourer
     * @param {string} labourerId
     * @returns {Promise<WorkEntry[]>}
     */
    async getWorkEntries(labourerId, organizationId) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            if (import.meta.env.DEV) console.warn("No auth token available");
            return [];
        }

        let url = `${API_BASE}/api/work`;
        const params = [];
        if (labourerId && labourerId !== 'undefined') params.push(`labourer_id=${labourerId}`);
        if (organizationId) params.push(`organization_id=${organizationId}`);
        
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (import.meta.env.DEV) console.error('[WorkService] Fetch failed:', errorData);
            throw new Error(errorData.error || errorData.message || 'Failed to fetch work entries');
        }
        const data = await response.json();

        // Filtering by labourerId if backend doesn't handle query param yet
        const filtered = (labourerId && labourerId !== 'undefined')
            ? data.filter(e => e.labourer_id === labourerId)
            : data;

        return filtered.map(entry => new WorkEntry(entry));
    },

    /**
     * Create a new work entry
     * @param {Object} entryData
     * @returns {Promise<WorkEntry>}
     */
    async createWorkEntry(entryData) {
        if (!navigator.onLine) {
            // Lazy import to prevent circular dependency
            const { offlineSyncService } = await import('./offlineSyncService');
            await offlineSyncService.enqueueWorkEntry(entryData);
            return new WorkEntry({ ...entryData, id: 'offline-' + Date.now(), status: 'pending' });
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("Authentication token required to create work entry");
        }

        const response = await fetch(`${API_BASE}/api/work`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create work entry');
        }
        const data = await response.json();
        return new WorkEntry(data);
    },

    /**
     * Create multiple work entries (Bulk Insert)
     * @param {Object[]} entriesData
     * @returns {Promise<WorkEntry[]>}
     */
    async createBulkWorkEntries(entriesData) {
        if (!navigator.onLine) {
            const queue = JSON.parse(localStorage.getItem('shramflow_offline_queue') || '[]');
            queue.push({ type: 'bulk', data: entriesData, timestamp: Date.now() });
            localStorage.setItem('shramflow_offline_queue', JSON.stringify(queue));
            
            return entriesData.map(e => new WorkEntry({ ...e, id: 'offline-' + Date.now(), status: 'pending' }));
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("Authentication token required for bulk insert");
        }

        const response = await fetch(`${API_BASE}/api/work/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ entries: entriesData })
        });

        if (!response.ok) {
            const error = await response.json();
            if (import.meta.env.DEV) console.error('[WorkService] Bulk insert failed:', error);
            throw new Error(error.error || 'Failed to save bulk entries');
        }

        const data = await response.json();
        return data.map(entry => new WorkEntry(entry));
    },

    /**
     * Undo the most recent work entry (within 10 min window)
     */
    async undoLastEntry() {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`${API_BASE}/api/work/undo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Undo failed');
        }

        return await response.json();
    },

    /**
     * Sync any pending offline entries from localStorage
     */
    async syncOfflineEntries() {
        if (!navigator.onLine) return;

        const queue = JSON.parse(localStorage.getItem('shramflow_offline_queue') || '[]');
        if (queue.length === 0) return;

        console.log(`[OfflineSync] Attempting to sync ${queue.length} items...`);
        const remainingQueue = [];

        for (const item of queue) {
            try {
                if (item.type === 'bulk') {
                    await this.createBulkWorkEntries(item.data);
                } else {
                    await this.createWorkEntry(item.data);
                }
            } catch (err) {
                console.error('[OfflineSync] Item sync failed:', err);
                remainingQueue.push(item);
            }
        }

        localStorage.setItem('shramflow_offline_queue', JSON.stringify(remainingQueue));
        return remainingQueue.length === 0;
    },

    /**
     * Fetch pending acknowledgments
     * @param {string} labourerId
     * @returns {Promise<any[]>}
     */
    async getPendingAcknowledgments(labourerId) {
        const { data, error } = await supabase
            .from('work_acknowledgments')
            .select('*, work_entries(*)')
            .eq('labourer_id', labourerId)
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    },

    /**
     * Ackowledge (Confirm/Dispute) a work entry
     * @param {string} ackId
     * @param {string} status
     * @param {string} [notes]
     */
    async acknowledgeWork(ackId, status, notes) {
        const { error } = await supabase
            .from('work_acknowledgments')
            .update({ status, notes, responded_at: new Date().toISOString() })
            .eq('id', ackId);

        if (error) throw error;
    },

    /**
     * Update a labourer's rate per meter
     * @param {string} labourerId
     * @param {number} rate
     */
    async updateLabourerRate(labourerId, rate) {
        const { error } = await supabase
            .from('labourers')
            .update({ rate_per_meter: rate })
            .eq('id', labourerId);

        if (error) throw error;
    },

    /**
     * Fetch work entries for a project on a specific date
     * @param {string} projectId 
     * @param {string} date (YYYY-MM-DD)
     */
    async getProjectEntriesByDate(projectId, date) {
        const { data, error } = await supabase
            .from('work_entries')
            .select('*')
            .eq('project_id', projectId)
            .eq('date', date)
            .eq('is_deleted', false);
        
        return { data, error };
    },

    /**
     * Update status of a work entry
     * @param {string} id
     * @param {string} status
     * @param {string} [rejectedReason]
     */
    async updateWorkStatus(id, status, rejectedReason) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("Authentication token required to update status");
        }

        const response = await fetch(`${API_BASE}/api/work/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, rejected_reason: rejectedReason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update status');
        }

        return await response.json();
    },

    /**
     * Delete a work entry (Soft Delete)
     * @param {string} id
     */
    async deleteWorkEntry(id) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("Authentication token required to delete work entry");
        }

        const response = await fetch(`${API_BASE}/api/work/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete work entry');
        }

        return await response.json();
    },

    /**
     * Upload work evidence photo to Supabase Storage
     * @param {File} file - The image file to upload
     * @param {string} userId - User ID for the folder name
     * @param {string} type - 'before' or 'after' or 'general'
     * @returns {Promise<string>} The public URL of the uploaded image
     */
    async uploadFile(file, userId, type) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { data, error } = await supabase.storage
            .from('work-evidence')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('work-evidence')
            .getPublicUrl(data.path);

        return publicUrl;
    }
};
