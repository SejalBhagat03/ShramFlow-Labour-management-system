// Offline Storage Service using IndexedDB for work claims
// Designed for unreliable rural connectivity

import { supabase } from "@/lib/supabase";

const DB_NAME = "ShramFlowOffline";
const DB_VERSION = 1;
const STORE_NAME = "workClaims";

class OfflineStorageService {
    constructor() {
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.listeners = new Set();

        this.initDB();

        // Listen to online/offline events
        window.addEventListener("online", () => {
            this.isOnline = true;
            this.syncPendingClaims();
        });

        window.addEventListener("offline", () => {
            this.isOnline = false;
        });
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "localId" });
                    store.createIndex("syncStatus", "syncStatus", { unique: false });
                    store.createIndex("labourerId", "labourerId", { unique: false });
                    store.createIndex("date", "date", { unique: false });
                }
            };
        });
    }

    async getDB() {
        if (this.db) return this.db;
        return this.initDB();
    }

    // Generate unique local ID
    generateLocalId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Convert File to base64 for offline storage
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    }

    // Convert base64 to Blob for upload
    base64ToBlob(base64) {
        const parts = base64.split(";base64,");
        const contentType = parts[0].split(":")[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    }

    // Save work claim offline
    async saveOfflineClaim(claim) {
        const db = await this.getDB();
        const localId = this.generateLocalId();

        const fullClaim = {
            ...claim,
            localId,
            syncStatus: "pending",
            createdAt: new Date().toISOString(),
            lastSyncAttempt: null,
            syncError: null,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(fullClaim);

            request.onsuccess = () => {
                this.notifyListeners();
                // Try to sync immediately if online
                if (this.isOnline) {
                    this.syncPendingClaims();
                }
                resolve(localId);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Get all offline claims
    async getAllClaims() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get pending (unsynced) claims
    async getPendingClaims() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("syncStatus");
            const request = index.getAll("pending");

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get failed claims
    async getFailedClaims() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("syncStatus");
            const request = index.getAll("failed");

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Update claim status
    async updateClaimStatus(localId, status, error) {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(localId);

            getRequest.onsuccess = () => {
                const claim = getRequest.result;
                if (claim) {
                    claim.syncStatus = status;
                    claim.lastSyncAttempt = new Date().toISOString();
                    if (error) claim.syncError = error;

                    const putRequest = store.put(claim);
                    putRequest.onsuccess = () => {
                        this.notifyListeners();
                        resolve();
                    };
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // Delete synced claim
    async deleteClaim(localId) {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(localId);

            request.onsuccess = () => {
                this.notifyListeners();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Upload photo to storage
    async uploadPhoto(base64, userId, type) {
        const blob = this.base64ToBlob(base64);
        const fileName = `${userId}/${Date.now()}_${type}.jpg`;

        const { error: uploadError } = await supabase.storage.from("work-evidence").upload(fileName, blob);

        if (uploadError) throw uploadError;

        const {
            data: { publicUrl },
        } = supabase.storage.from("work-evidence").getPublicUrl(fileName);

        return publicUrl;
    }

    // Sync a single claim
    async syncClaim(claim, userId) {
        try {
            let photoUrl = claim.photoUrl;
            let photoUrlAfter = claim.photoUrlAfter;

            // Upload photos if stored as base64
            if (claim.photoBase64 && !claim.photoUrl) {
                photoUrl = await this.uploadPhoto(claim.photoBase64, userId, "before");
            }
            if (claim.photoAfterBase64 && !claim.photoUrlAfter) {
                photoUrlAfter = await this.uploadPhoto(claim.photoAfterBase64, userId, "after");
            }

            // Upsert to Supabase
            const { error } = await supabase.from("work_claims").upsert(
                {
                    labourer_id: claim.labourerId,
                    date: claim.date,
                    claimed_meters: claim.claimedMeters,
                    photo_url: photoUrl,
                    photo_url_after: photoUrlAfter,
                    latitude: claim.latitude,
                    longitude: claim.longitude,
                    location_name: claim.locationName,
                    notes: claim.notes,
                    local_id: claim.localId,
                    sync_status: "synced",
                },
                { onConflict: "labourer_id,date" },
            );

            if (error) throw error;

            // Remove from local storage after successful sync
            await this.deleteClaim(claim.localId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await this.updateClaimStatus(claim.localId, "failed", errorMessage);
            throw error;
        }
    }

    // Sync all pending claims
    async syncPendingClaims() {
        if (this.syncInProgress || !this.isOnline) {
            return { synced: 0, failed: 0 };
        }

        this.syncInProgress = true;
        let synced = 0;
        let failed = 0;

        try {
            const pendingClaims = await this.getPendingClaims();
            const failedClaims = await this.getFailedClaims();
            const allToSync = [...pendingClaims, ...failedClaims];

            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                this.syncInProgress = false;
                return { synced: 0, failed: allToSync.length };
            }

            for (const claim of allToSync) {
                try {
                    await this.syncClaim(claim, user.id);
                    synced++;
                } catch {
                    failed++;
                }
            }
        } finally {
            this.syncInProgress = false;
            this.notifyListeners();
        }

        return { synced, failed };
    }

    // Get counts for UI display
    async getCounts() {
        const pending = await this.getPendingClaims();
        const failed = await this.getFailedClaims();
        const all = await this.getAllClaims();

        return {
            pending: pending.length,
            failed: failed.length,
            synced: all.length - pending.length - failed.length,
        };
    }

    // Check if online
    getOnlineStatus() {
        return this.isOnline;
    }

    // Subscribe to changes
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners() {
        this.listeners.forEach((listener) => listener());
    }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService();
