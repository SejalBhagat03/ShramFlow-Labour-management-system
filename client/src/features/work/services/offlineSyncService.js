import { get, set, update, del } from 'idb-keyval';
import { workService } from './workService';

const QUEUE_KEY = 'offline-work-entry-queue';

export const offlineSyncService = {
    async enqueueWorkEntry(entryData) {
        await update(QUEUE_KEY, (val) => {
            const queue = val || [];
            queue.push({
                ...entryData,
                _offline_id: Date.now().toString(),
                _timestamp: new Date().toISOString()
            });
            return queue;
        });
        
        // Try sync immediately if online
        if (navigator.onLine) {
            this.syncQueue();
        }
    },

    async cacheMetadata(key, data) {
        await set(`cache-${key}`, {
            data,
            _timestamp: new Date().toISOString()
        });
    },

    async getCachedMetadata(key) {
        const cached = await get(`cache-${key}`);
        return cached?.data || null;
    },

    async getQueue() {
        return (await get(QUEUE_KEY)) || [];
    },

    async clearQueue() {
        await del(QUEUE_KEY);
    },

    async getPendingCount() {
        const queue = await this.getQueue();
        return queue.length;
    },

    async syncQueue() {
        if (!navigator.onLine) return { synced: 0, failed: 0 };
        
        const queue = await this.getQueue();
        if (queue.length === 0) return { synced: 0, failed: 0 };

        let syncedCount = 0;
        let remainingQueue = [];



        for (const entry of queue) {
            try {
                // Exponential backoff or retry check
                const attempts = entry._attempts || 0;
                if (attempts > 5) {
                    console.error("Giving up on entry after 5 attempts:", entry);
                    // Move to a 'failed' bucket instead of blocking the queue?
                    continue; 
                }

                await workService.createWorkEntry({
                    ...entry,
                    _is_syncing: true // Flag to avoid accidental loops
                });
                
                syncedCount++;
            } catch (err) {
                console.error("Offline sync failed for entry", entry, err);
                remainingQueue.push({
                    ...entry,
                    _attempts: (entry._attempts || 0) + 1,
                    _last_error: err.message
                });
            }
        }

        await set(QUEUE_KEY, remainingQueue);

        if (syncedCount > 0) {
            window.dispatchEvent(new CustomEvent('offline-sync-complete', {
                detail: { count: syncedCount, remaining: remainingQueue.length }
            }));
        }

        return { synced: syncedCount, remaining: remainingQueue.length };
    },

    setupListeners() {
        window.addEventListener('online', () => {
            this.syncQueue();
        });
    }
};

offlineSyncService.setupListeners();
