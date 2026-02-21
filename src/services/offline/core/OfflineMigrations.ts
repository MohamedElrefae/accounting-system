/**
 * OfflineMigrations.ts
 * Manages schema versioning and data migrations for the client-side IndexedDB.
 * 
 * Responsibilities:
 * - Define migration paths from version n to n+1
 * - Seed initial metadata (fiscal periods, account codes) from server
 * - Handle data transformation during schema updates
 */

import { getOfflineDB } from './OfflineSchema';
import { supabase } from '../../../utils/supabase';
import { DB_CONSTANTS } from './OfflineConfig';
import { getConnectionMonitor } from '../../../utils/connectionMonitor';

export class MigrationManager {
    private static instance: MigrationManager;

    private constructor() {}

    public static getInstance(): MigrationManager {
        if (!MigrationManager.instance) {
            MigrationManager.instance = new MigrationManager();
        }
        return MigrationManager.instance;
    }

    /**
     * Requirement 9.2: Database Migration System.
     * Executes necessary schema upgrades and data migrations.
     */
    public async migrate(): Promise<void> {
        const currentVersion = await this.getCurrentVersion();
        
        if (currentVersion < DB_CONSTANTS.DB_VERSION) {
            console.info(`[Migrations] Upgrading database from v${currentVersion} to v${DB_CONSTANTS.DB_VERSION}`);
            // Dexie handles schema changes via .version().stores()
            // Here we would perform manual data transformations if needed.
            await this.updateVersion(DB_CONSTANTS.DB_VERSION);
        }
    }

    /**
     * Requirement 9.7: Rollback Procedures.
     * In case of a failed migration, we can reset to a known state.
     */
    public async rollback(): Promise<void> {
        console.warn('[Migrations] Rollback initiated. Resetting offline database.');
        // For local IndexedDB, rollback usually means wiping and re-syncing from server
        const { destroyOfflineDB } = await import('./OfflineSchema');
        await destroyOfflineDB();
    }

    /**
     * Seeds initial metadata needed for offline operation.
     */
    public async seedInitialData(): Promise<void> {
        const db = getOfflineDB();
        const monitor = getConnectionMonitor();
        
        // Strict verified online check
        if (!monitor.getHealth().isOnline) {
            if (import.meta.env.DEV) console.info('[Migrations] Offline: Skipping initial data seeding');
            return;
        }

        if (import.meta.env.DEV) console.info('[Migrations] Starting initial data seeding...');

        // 1. Seed Fiscal Periods
        try {
            const { data: periods, error: pError } = await supabase.from('fiscal_periods').select('*');
            if (!pError && periods) {
                for (const p of periods) {
                    await db.metadata.put({ 
                        key: `fiscal_period_${p.id}`, 
                        value: p, 
                        updatedAt: new Date().toISOString() 
                    });
                }
            }
        } catch (err) {
            // SILENT
        }

        // 2. Seed Organizations
        try {
            const { data: orgs, error: oError } = await supabase
                .from('organizations')
                .select('id, code, name, name_ar, is_active')
                .eq('is_active', true);
            
            if (!oError && orgs) {
                await db.metadata.put({
                    key: 'organizations_cache',
                    value: orgs,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${orgs.length} organizations`);
            }
        } catch (err) {
            // SILENT
        }

        // 2b. Seed Accounts
        try {
            const { data: accounts, error: aError } = await supabase
                .from('accounts')
                .select('id, code, name, name_ar, parent_id, org_id, level, is_postable');
            
            if (!aError && accounts) {
                await db.metadata.put({
                    key: 'accounts_cache',
                    value: accounts,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${accounts.length} accounts`);
            }
        } catch (err) {
            // SILENT
        }

        // 3. Seed Projects (User-accessible)
        try {
            const { data: projects, error: prError } = await (supabase.rpc('get_user_accessible_projects') as any);
            if (!prError && projects) {
                await db.metadata.put({
                    key: 'projects_cache',
                    value: projects,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${projects.length} projects`);
            }
        } catch (err) {
            // SILENT
        }

        // 3b. Seed Cost Centers
        try {
            const { data: costCenters, error: ccError } = await supabase
                .from('cost_centers')
                .select('id, code, name, name_ar, project_id, org_id, is_active');
            if (!ccError && costCenters) {
                await db.metadata.put({
                    key: 'cost_centers_cache',
                    value: costCenters,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${costCenters.length} cost centers`);
            }
        } catch (err) {
            // SILENT
        }

        // 3c. Seed Analysis Work Items
        try {
            const { data: analysisItems, error: awiError } = await supabase
                .from('analysis_work_items')
                .select('id, code, name, name_ar, org_id, is_active');
            if (!awiError && analysisItems) {
                await db.metadata.put({
                    key: 'analysis_work_items_cache',
                    value: analysisItems,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${analysisItems.length} analysis work items`);
            }
        } catch (err) {
            // SILENT
        }

        // 3d. Seed Transaction Classifications
        try {
            const { data: classifications, error: tcError } = await supabase
                .from('transaction_classification')
                .select('id, code, name, post_to_costs, org_id');
            if (!tcError && classifications) {
                await db.metadata.put({
                    key: 'classifications_cache',
                    value: classifications,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${classifications.length} classifications`);
            }
        } catch (err) {
            // SILENT
        }

        // 3e. Seed Sub Tree (Expenses Categories)
        try {
            const { data: subTree, error: stError } = await supabase
                .from('sub_tree')
                .select('*');
            if (!stError && subTree) {
                await db.metadata.put({
                    key: 'sub_tree_cache',
                    value: subTree,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${subTree.length} sub_tree items`);
            }
        } catch (err) {
            // SILENT
        }

        // 3f. Seed Work Items (Catalog)
        try {
            const { data: workItems, error: wiError } = await supabase
                .from('work_items')
                .select('*');
            if (!wiError && workItems) {
                await db.metadata.put({
                    key: 'work_items_cache',
                    value: workItems,
                    updatedAt: new Date().toISOString()
                });
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${workItems.length} work items`);
            }
        } catch (err) {
            // SILENT
        }

        // 4. Seed Transactions and Lines (Last 6 months)
        try {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const dateStr = sixMonthsAgo.toISOString().split('T')[0];

            if (import.meta.env.DEV) console.info(`[Migrations] Seeding transactions since ${dateStr}...`);

            const { data: txs, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
                .gte('entry_date', dateStr)
                .order('entry_date', { ascending: false })
                .limit(1000);

            if (!txError && txs) {
                // Use bulk put for speed
                const storedTxs = txs.map(t => ({
                    ...t,
                    _pk: t.id,
                    _storedAt: new Date().toISOString(),
                    syncStatus: t.is_posted ? 'posted' : 'pending_verification'
                }));
                await db.transactions.bulkPut(storedTxs);
                if (import.meta.env.DEV) console.log(`[Migrations] Seeded ${txs.length} transactions`);

                // Seed lines for these transactions
                const txIds = txs.map(t => t.id);
                if (txIds.length > 0) {
                    // Fetch lines in chunks of 100 txIds to avoid query length limits
                    for (let i = 0; i < txIds.length; i += 100) {
                        const chunk = txIds.slice(i, i + 100);
                        const { data: lines, error: lError } = await supabase
                            .from('transaction_lines')
                            .select('*')
                            .in('transaction_id', chunk);

                        if (!lError && lines) {
                            const storedLines = lines.map(l => ({
                                ...l,
                                _pk: l.id,
                                _storedAt: new Date().toISOString(),
                                syncStatus: l.line_status === 'approved' ? 'verified' : 'pending_verification'
                            }));
                            await db.transactionLines.bulkPut(storedLines);
                        }
                    }
                    if (import.meta.env.DEV) console.log(`[Migrations] Seeded lines for transactions`);
                }
            }
        } catch (err) {
            // SILENT
        }

        if (import.meta.env.DEV) console.info('[Migrations] Initial data seeding complete.');
    }

    private async getCurrentVersion(): Promise<number> {
        const db = getOfflineDB();
        const ver = await db.metadata.get('db_version');
        return (ver?.value as number) || 0;
    }

    private async updateVersion(version: number): Promise<void> {
        const db = getOfflineDB();
        await db.metadata.put({ 
            key: 'db_version', 
            value: version, 
            updatedAt: new Date().toISOString() 
        });
    }
}

export const migrationManager = MigrationManager.getInstance();
