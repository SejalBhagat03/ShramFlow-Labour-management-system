import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { voiceService } from '@/lib/voiceService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage offline synchronization
 */
export const useOfflineSync = () => {
    const { toast } = useToast();
    const [state, setState] = useState({
        isOnline: navigator.onLine,
        pendingCount: 0,
        failedCount: 0,
        isSyncing: false,
        pendingClaims: [],
    });

    // Update state from storage
    const updateState = useCallback(async () => {
        const counts = await offlineStorage.getCounts();
        const pending = await offlineStorage.getPendingClaims();

        setState(prev => ({
            ...prev,
            isOnline: offlineStorage.getOnlineStatus(),
            pendingCount: counts.pending,
            failedCount: counts.failed,
            pendingClaims: pending,
        }));
    }, []);

    // Manual sync trigger
    const syncNow = useCallback(async () => {
        if (state.isSyncing) return;

        setState(prev => ({ ...prev, isSyncing: true }));

        try {
            const result = await offlineStorage.syncPendingClaims();

            if (result.synced > 0) {
                toast({
                    title: `${result.synced} claim(s) synced`,
                    description: result.failed > 0
                        ? `${result.failed} failed. Will retry later.`
                        : 'All work claims are up to date.',
                });
            }
        } catch (error) {
            console.error('Sync failed:', error);
            toast({
                title: 'Sync failed',
                description: 'Will retry automatically when connection is stable.',
                variant: 'destructive',
            });
        } finally {
            setState(prev => ({ ...prev, isSyncing: false }));
            updateState();
        }
    }, [state.isSyncing, toast, updateState]);

    // Subscribe to storage changes
    useEffect(() => {
        updateState();

        const unsubscribe = offlineStorage.subscribe(updateState);

        // Listen to online/offline events
        const handleOnline = () => {
            setState(prev => ({ ...prev, isOnline: true }));
            toast({
                title: 'Back online',
                description: 'Syncing your work claims...',
            });
            voiceService.speak('synced');
            syncNow();
        };

        const handleOffline = () => {
            setState(prev => ({ ...prev, isOnline: false }));
            toast({
                title: 'Offline',
                description: 'Your work will be saved locally and synced later.',
                variant: 'destructive',
            });
            voiceService.speak('noInternet');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [updateState, toast, syncNow]);

    // Save work claim (handles online/offline automatically)
    const saveWorkClaim = useCallback(async (claim) => {
        let photoBase64 = null;
        let photoAfterBase64 = null;

        // Convert files to base64 for offline storage
        if (claim.photoFile) {
            photoBase64 = await offlineStorage.fileToBase64(claim.photoFile);
        }
        if (claim.photoAfterFile) {
            photoAfterBase64 = await offlineStorage.fileToBase64(claim.photoAfterFile);
        }

        const localId = await offlineStorage.saveOfflineClaim({
            labourerId: claim.labourerId,
            date: claim.date,
            claimedMeters: claim.claimedMeters,
            photoUrl: null,
            photoUrlAfter: null,
            photoBase64,
            photoAfterBase64,
            latitude: claim.latitude || null,
            longitude: claim.longitude || null,
            locationName: claim.locationName || null,
            notes: claim.notes || null,
        });

        const isOffline = !offlineStorage.getOnlineStatus();

        if (isOffline) {
            voiceService.speak('noInternet');
        }

        return { localId, isOffline };
    }, []);

    return {
        ...state,
        syncNow,
        saveWorkClaim,
    };
};
