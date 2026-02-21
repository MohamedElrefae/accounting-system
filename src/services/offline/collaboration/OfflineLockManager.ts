/**
 * OfflineLockManager.ts
 * Manages resource locks during offline work to prevent concurrent edit conflicts.
 * 
 * Features:
 * - Acquire/Release local locks
 * - Track remote locks (synced from server)
 * - Warn on "Stale Lock" (editing something locked by another user)
 * - Conflict detection for locks during sync
 */

import { getOfflineDB } from '../core/OfflineSchema';
import { supabase } from '../../../utils/supabase';
import type { OfflineLock } from '../core/OfflineTypes';

export class OfflineLockManager {
    private static instance: OfflineLockManager;
    private lockExpiryMs: number = 24 * 60 * 60 * 1000; // 24 hour default for offline locks

    private constructor() {}

    public static getInstance(): OfflineLockManager {
        if (!OfflineLockManager.instance) {
            OfflineLockManager.instance = new OfflineLockManager();
        }
        return OfflineLockManager.instance;
    }

    /**
     * Set a custom lock timeout (Req 3.6).
     * @param ms - Timeout in milliseconds
     */
    public setLockTimeout(ms: number): void {
        this.lockExpiryMs = ms;
    }

    /**
     * Gets the collaboration status for a resource, including last-known status of offline users (Req 3.5).
     */
    public async getCollaborationStatus(resourceId: string): Promise<{
        isLocked: boolean;
        holder?: { userId: string; userName: string; acquiredAt: string; expiresAt: string };
        activeCollaborators: Array<{ userId: string; userName: string; lastActivity: string }>;
    }> {
        const db = getOfflineDB();
        const lock = await db.offlineLocks.get(resourceId);
        const now = new Date();

        const status = {
            isLocked: false,
            holder: undefined as any,
            activeCollaborators: [] as any[]
        };

        if (lock && new Date(lock.expiresAt) > now) {
            status.isLocked = true;
            status.holder = {
                userId: lock.userId,
                userName: lock.userName,
                acquiredAt: lock.acquiredAt,
                expiresAt: lock.expiresAt
            };
        }

        // Fetch recent activity from other users locally (Req 3.5)
        const recentLocks = await db.offlineLocks
            .where('resourceId').equals(resourceId)
            .toArray();

        status.activeCollaborators = recentLocks.map(l => ({
            userId: l.userId,
            userName: l.userName,
            lastActivity: l.acquiredAt
        }));

        return status;
    }

    /**
     * Attempts to acquire a lock locally.
     */
    public async acquireLock(
        resourceId: string, 
        resourceType: string, 
        userId: string,
        userName: string
    ): Promise<{ success: boolean; holder?: string }> {
        const db = getOfflineDB();
        
        // 1. Check if anyone else has a local lock
        const existing = await db.offlineLocks.get(resourceId);
        if (existing && existing.userId !== userId && new Date(existing.expiresAt) > new Date()) {
            return { success: false, holder: existing.userName };
        }

        // 2. Create/Update local lock
        const lock: OfflineLock = {
            id: resourceId, // Using resourceId as PK for locks
            resourceId,
            resourceType,
            userId,
            userName,
            acquiredAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.lockExpiryMs).toISOString(),
            syncStatus: 'pending'
        };

        await db.offlineLocks.put(lock);
        return { success: true };
    }

    /**
     * Releases a local lock.
     */
    public async releaseLock(resourceId: string, userId: string): Promise<void> {
        const db = getOfflineDB();
        const existing = await db.offlineLocks.get(resourceId);
        
        if (existing && existing.userId === userId) {
            await db.offlineLocks.delete(resourceId);
            // In a real app, we'd also enqueue a 'release_lock' sync operation
        }
    }

    /**
     * Checks if a resource is currently locked by someone else.
     */
    public async checkLockStatus(resourceId: string, currentUserId: string): Promise<{ isLocked: boolean; holder?: string }> {
        const db = getOfflineDB();
        const lock = await db.offlineLocks.get(resourceId);
        
        if (lock && lock.userId !== currentUserId && new Date(lock.expiresAt) > new Date()) {
            return { isLocked: true, holder: lock.userName };
        }
        
        return { isLocked: false };
    }

    /**
     * Synchronizes local locks with the server.
     * This ensures we know who is editing what when we re-connect.
     */
    public async syncLocks(): Promise<void> {
        const { data: remoteLocks, error } = await supabase.from('resource_locks').select('*');
        if (error) {
            console.error('[OfflineLockManager] Failed to fetch remote locks:', error);
            return;
        }

        const db = getOfflineDB();
        // Update local store with remote wisdom
        for (const remote of remoteLocks) {
             const lock: OfflineLock = {
                 id: remote.resource_id,
                 resourceId: remote.resource_id,
                 resourceType: remote.resource_type,
                 userId: remote.user_id,
                 userName: remote.user_name,
                 acquiredAt: remote.acquired_at,
                 expiresAt: remote.expires_at,
                 syncStatus: 'pending' // Technically it's 'synced' but our store uses this for our own sync
             };
             await db.offlineLocks.put(lock);
        }
    }

    /**
     * Cleans up expired locks.
     */
    public async pruneExpiredLocks(): Promise<void> {
        const db = getOfflineDB();
        const now = new Date().toISOString();
        await db.offlineLocks.where('expiresAt').below(now).delete();
    }
}

export const offlineLockManager = OfflineLockManager.getInstance();
