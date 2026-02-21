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

    useEffect(() => {
        const monitor = getConnectionMonitor();

        const initializeOffline = async () => {
            try {
                await storageMonitor.initialize();
                await requestPersistentStorage();
                await migrationManager.migrate();
                await migrationManager.seedInitialData();
                await securityManager.syncWithSupabase();

                // Initial count
                setPendingCount(await getQueueLength());

                // Wait for the first verified connectivity check before starting sync.
                // ConnectionMonitor pings a known endpoint; this never trusts navigator.onLine.
                const currentHealth = monitor.getHealth();
                if (currentHealth.isOnline) {
                    if (import.meta.env.DEV) console.log('[OfflineProvider] Already verified online — starting sync.');
                    await syncEngine.startSync();
                } else {
                    if (import.meta.env.DEV) console.log('[OfflineProvider] Offline on boot — sync deferred until connection verified.');
                }

                setIsInitialized(true);
            } catch (error) {
                console.error('[OfflineProvider] Initialization failed:', error);
                setIsInitialized(true); // Still mark initialized so UI renders in degraded mode
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

        return () => {
            unsubscribe();
            unsubscribeMonitor();
            subscription.unsubscribe();
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
