/**
 * OfflineProvider.tsx
 * The central coordinator for the offline-first system.
 * Wraps the application to provide offline state and initialize services.
 *
 * IMPORTANT: All connectivity decisions are delegated to ConnectionMonitor.
 * navigator.onLine is intentionally never used here — it is unreliable on
 * metered / captive-portal networks. ConnectionMonitor performs a verified
 * ping before setting isOnline: true.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { requestPersistentStorage } from '../services/offline/core/OfflineSchema';
import { syncEngine, type SyncProgress } from '../services/offline/sync/SynchronizationEngine';
import { securityManager } from '../services/offline/security/SecurityManager';
import { storageMonitor } from '../services/offline/monitoring/StorageMonitor';
import { migrationManager } from '../services/offline/core/OfflineMigrations';
import { OfflineBanner } from './offline/OfflineBanner';
import { UnifiedErrorOverlay } from './offline/UnifiedErrorOverlay';
import { supabase } from '../utils/supabase';
import { offlineAPI, UnifiedOfflineAPI } from '../services/offline/core/OfflineAPI';
import { getQueueLength } from '../services/offline/sync/SyncQueueManager';
import { getConnectionMonitor } from '../utils/connectionMonitor';
import { BasicConflictModal } from './offline/BasicConflictModal';
import { ConflictResolutionWizard, type ConflictData } from './offline/ConflictResolutionWizard';
import { getOfflineDB } from '../services/offline/core/OfflineSchema';
import { markSynced } from '../services/offline/sync/SyncQueueManager';

interface OfflineContextType {
    isInitialized: boolean;
    isOnline: boolean;
    pendingOperations: number;
    syncProgress: SyncProgress;
    api: UnifiedOfflineAPI;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    // Start pessimistic — ConnectionMonitor will verify the real state before sync starts.
    // This prevents the sync engine from running against a captive portal / metered network.
    const [isOnline, setIsOnline] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress>(syncEngine.getSyncStatus());
    const [pendingCount, setPendingCount] = useState(0);
    const [activeConflict, setActiveConflict] = useState<ConflictData | null>(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    useEffect(() => {
        const monitor = getConnectionMonitor();

        const initializeOffline = async () => {
            try {
                // 1. Core local storage & migrations MUST be ready first
                await storageMonitor.initialize();
                await requestPersistentStorage();
                await migrationManager.migrate();
                await migrationManager.seedInitialData();
                await securityManager.syncWithSupabase();

                // 2. Refresh initial sync queue state
                setPendingCount(await getQueueLength());

                // 3. Wait for the ConnectionMonitor to perform its first verified check.
                // This prevents "offline" sync attempts on boot if the connection is slow.
                let health = monitor.getHealth();

                // If the monitor hasn't completed its first check yet (often true right at mount),
                // we'll use the current health and let the subscriber handle updates.
                setIsOnline(health.isOnline);

                // 4. If we are verified online, start the engine.
                if (health.isOnline) {
                    if (import.meta.env.DEV) console.log('[OfflineProvider] Verified ONLINE on boot — starting initial sync.');
                    await syncEngine.startSync();
                } else {
                    if (import.meta.env.DEV) console.log('[OfflineProvider] Verified OFFLINE on boot — sync deferred.');
                }

                setIsInitialized(true);
            } catch (error) {
                console.error('[OfflineProvider] Critical initialization failed:', error);
                // Still mark partially initialized so UI doesn't hang, 
                // but degraded mode will be active.
                setIsInitialized(true);
            }
        };

        initializeOffline();

        // Subscribe to sync progress
        const unsubscribe = syncEngine.addListener((state) => {
            setSyncProgress(state);
            if (!state.isSyncing) {
                getQueueLength().then(setPendingCount);
            } else {
                setPendingCount(state.total - (state.synced + (state.conflicts || 0) + (state.errors || 0)));
            }
        });

        // Track verified connection status from ConnectionMonitor — not from browser events directly.
        // The monitor already listens to window online/offline and validates with a ping before
        // notifying listeners, so we get a reliable signal here.
        // subscribe() immediately calls handleHealthChange with current state, then on every change.
        const unsubscribeMonitor = monitor.subscribe((health) => {
            const prevIsOnline = monitor.getHealth().isOnline;
            setIsOnline(health.isOnline);

            if (!prevIsOnline && health.isOnline) {
                // Transitioned online → trigger sync
                if (import.meta.env.DEV) console.log('[OfflineProvider] Connection verified — starting sync.');
                syncEngine.startSync().catch(err =>
                    console.warn('[OfflineProvider] startSync after reconnect failed:', err)
                );
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                syncEngine.resumeOnLogin().catch(err =>
                    console.warn('[OfflineProvider] resumeOnLogin failed:', err)
                );
            }
        });

        const handleConflictEvent = async (e: any) => {
            const { entryId, entityType, message, conflictData: directConflictData } = e.detail;

            if (directConflictData) {
                setActiveConflict(directConflictData);
                setIsConflictModalOpen(true);
                return;
            }

            if (!entryId) return;

            // Try to fetch full details from DB for the wizard
            const db = getOfflineDB();
            const entry = await db.syncQueue.get(entryId);

            if (entry) {
                const conflictData: ConflictData = {
                    id: entryId,
                    entityType: (entityType as any) || 'transaction',
                    entityId: entry.operation.entityId,
                    conflictType: 'edit_conflict',
                    severity: 'high',
                    conflictReasons: [message || 'Server version mismatch'],
                    affectedUsers: [],
                    fields: [], // Ideally we'd diff here, but for now we let wizard handle it or just show basic
                    localVersion: entry.operation.data || {},
                    serverVersion: {}, // Will be fetched by wizard if needed
                    localModifiedAt: entry.createdAt,
                    serverModifiedAt: new Date().toISOString(),
                    localModifiedBy: entry.operation.userId || 'You',
                    serverModifiedBy: 'Server',
                };
                setActiveConflict(conflictData);
                setIsConflictModalOpen(true);
            }
        };

        window.addEventListener('offline-sync-conflict' as any, handleConflictEvent);

        return () => {
            unsubscribe();
            unsubscribeMonitor();
            subscription.unsubscribe();
            window.removeEventListener('offline-sync-conflict' as any, handleConflictEvent);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <OfflineContext.Provider value={{
            isInitialized,
            isOnline,
            pendingOperations: pendingCount,
            syncProgress,
            api: offlineAPI
        }}>
            {children}
            {isInitialized && (
                <>
                    <OfflineBanner />
                    <UnifiedErrorOverlay />

                    <BasicConflictModal
                        open={isConflictModalOpen}
                        onClose={() => setIsConflictModalOpen(false)}
                        onResolve={async (action) => {
                            if (action === 'advanced') {
                                setIsConflictModalOpen(false);
                                setIsWizardOpen(true);
                            } else if (activeConflict) {
                                try {
                                    await supabase.auth.getUser();
                                    // Use ConflictResolver for consistent resolution logic
                                    // Strategy mapping: keep_mine -> last-write-wins (or rebase), keep_server -> server-wins
                                    // const strategy = action === 'keep_mine' ? 'sequence-rebase' : 'server-wins';

                                    // We need to convert from ConflictData (UI) to DataConflict (Service) or similar
                                    // For now, let's implement the direct resolution logic for common cases
                                    if (action === 'keep_server') {
                                        // Discard local: Mark as synced and sync engine will proceed
                                        await markSynced(activeConflict.id);
                                    } else {
                                        // Keep mine: We need to update the sync queue entry data with a higher version
                                        const db = getOfflineDB();
                                        const entry = await db.syncQueue.get(activeConflict.id);
                                        if (entry) {
                                            // Re-base version to bypass server check
                                            const updatedData = { ...entry.operation.data, version: (Number(entry.operation.data.version || 0) + 1) };
                                            await db.syncQueue.update(activeConflict.id, {
                                                status: 'pending',
                                                'operation.data': updatedData,
                                                error: undefined
                                            });
                                        }
                                    }

                                    setIsConflictModalOpen(false);
                                    setActiveConflict(null);
                                    // Trigger sync resume
                                    syncEngine.startSync();
                                } catch (err) {
                                    console.error('[OfflineProvider] Quick resolution failed:', err);
                                }
                            }
                        }}
                        entityName={activeConflict?.entityType}
                    />

                    <ConflictResolutionWizard
                        open={isWizardOpen}
                        conflict={activeConflict}
                        onClose={() => setIsWizardOpen(false)}
                        onResolve={async (action) => {
                            try {
                                /*
                                const strategyMap: Record<string, any> = {
                                    'keep_mine': 'sequence-rebase',
                                    'keep_server': 'server-wins',
                                    'keep_both': 'manual',
                                    'merge': 'manual'
                                };
                                */

                                console.info(`[OfflineProvider] Wizard resolution chosen: ${action}`);

                                if (action === 'keep_server' && activeConflict) {
                                    await markSynced(activeConflict.id);
                                } else if (activeConflict) {
                                    // For Keep Mine/Merge/Both, we update the queue entry
                                    const db = getOfflineDB();
                                    const entry = await db.syncQueue.get(activeConflict.id);
                                    if (entry) {
                                        const updatedData = { ...entry.operation.data, version: (Number(entry.operation.data.version || 0) + 1) };
                                        await db.syncQueue.update(activeConflict.id, {
                                            status: 'pending',
                                            'operation.data': updatedData,
                                            error: undefined
                                        });
                                    }
                                }

                                setIsWizardOpen(false);
                                setActiveConflict(null);
                                syncEngine.startSync();
                            } catch (err) {
                                console.error('[OfflineProvider] Wizard resolution failed:', err);
                            }
                        }}
                    />
                </>
            )}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) throw new Error('useOffline must be used within an OfflineProvider');
    return context;
};
