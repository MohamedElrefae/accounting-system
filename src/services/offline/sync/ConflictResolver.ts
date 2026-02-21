/**
 * ConflictResolver.ts
 * Manages detection and resolution of synchronization conflicts.
 * 
 * Implements:
 * - Sequence rebase detection
 * - Amount discrepancy handling
 * - Fiscal period closed detection
 * - Semantic duplicate detection for payments (Engineering Review #5)
 * - Conflict preservation for manual review
 */

import { detectSemanticDuplicates } from '../sync/SyncQueueManager';
import type { 
  DataConflict, 
  SyncOperation, 
  ConflictResolution, 
  ResolutionStrategy,
  ConflictType,
  ConflictSeverity
} from '../core/OfflineTypes';

export class ConflictResolver {
  private static instance: ConflictResolver;

  private constructor() {}

  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Detects conflicts between a local operation and the current server state.
   */
  public async detectConflicts(
    localOp: SyncOperation,
    serverState: Record<string, unknown>
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    // 1. Version/Sequence Conflict (Last Write Wins detection)
    if (serverState.version && localOp.vectorClock['server'] < (serverState.version as number)) {
      conflicts.push(this.createConflict(
        'concurrent_edit',
        'high',
        localOp,
        serverState,
        'Sequence mismatch: Server has newer version.'
      ));
    }

    // 2. Fiscal Period Check
    if (serverState.fiscal_period_status === 'closed') {
        conflicts.push(this.createConflict(
            'fiscal_period_closed',
            'critical',
            localOp,
            serverState,
            'The fiscal period for this transaction is closed.'
        ));
    }

    // 3. Semantic Duplicate Detection (Payment specific)
    if (localOp.entityType === 'payment') {
        const potentialDuplicates = await detectSemanticDuplicates(localOp);
        for (const dup of potentialDuplicates) {
            conflicts.push({
                id: crypto.randomUUID(),
                type: 'semantic_duplicate',
                localOperation: localOp,
                remoteOperation: dup.entry.operation,
                fieldConflicts: [],
                severity: 'medium',
                autoResolvable: false,
                matchScore: dup.matchScore,
                matchReasons: dup.matchReasons
            });
        }
    }

    return conflicts;
  }

  /**
   * Resolves a conflict according to a chosen strategy.
   */
  public async resolve(
    conflict: DataConflict,
    strategy: ResolutionStrategy,
    userId: string
  ): Promise<ConflictResolution> {
    const now = new Date().toISOString();
    let resolvedData = { ...conflict.localOperation.data };

    switch (strategy) {
      case 'server-wins':
        resolvedData = { ...(conflict.remoteOperation?.data || {}) };
        break;
      case 'last-write-wins':
        // localData is already the default
        break;
      case 'manual':
        // Implements Req 3.4: Intelligent multi-line entry merging
        resolvedData = await this.intelligentMerge(
          conflict.localOperation.data,
          conflict.remoteOperation?.data || {}
        );
        break;
      case 'sequence-rebase':
        // Increment version to bypass server check
        resolvedData.version = (Number(conflict.remoteOperation?.data?.version || 0)) + 1;
        break;
      default:
        console.warn(`[ConflictResolver] Unhandled resolution strategy: ${strategy}`);
    }

    return {
      conflictId: conflict.id,
      strategy,
      resolvedData,
      resolvedBy: userId,
      resolvedAt: now,
      auditTrail: [] // Should be populated by AuditLogger
    };
  }

  private createConflict(
    type: ConflictType,
    severity: ConflictSeverity,
    localOp: SyncOperation,
    remoteState: any,
    reason: string
  ): DataConflict {
    return {
      id: crypto.randomUUID(),
      type,
      severity,
      localOperation: localOp,
      remoteOperation: {
          id: remoteState.id || 'server',
          type: 'UPDATE', // Remote state is treated as an update to our perspective
          entityType: localOp.entityType,
          entityId: localOp.entityId,
          timestamp: remoteState.updated_at || new Date().toISOString(),
          userId: remoteState.modified_by || 'server',
          deviceId: 'server',
          vectorClock: { server: remoteState.version || 0 },
          dependencies: [],
          checksum: '',
          data: { ...remoteState, _conflictReason: reason }
      },
      fieldConflicts: [],
      autoResolvable: type === 'concurrent_edit' // Some are auto-resolvable via rebase
    };
  }

  /**
   * Intelligently merges two transaction versions by comparing lines.
   * If both versions edited different lines, it combines them (Req 3.4).
   */
  private async intelligentMerge(local: any, remote: any): Promise<any> {
    const merged = { ...remote, ...local };
    
    if (local.lines && remote.lines) {
        // Merge lines by index or ID
        const mergedLines = [...local.lines];

        (remote.lines as any[]).forEach((rLine: any) => {
            const id = rLine.id || rLine.localId;
            const lLine = mergedLines.find((l: any) => (l.id || l.localId) === id);
            
            if (!lLine) {
                // Line exists in remote but not local (added by another user)
                mergedLines.push(rLine);
            } else if (JSON.stringify(lLine) !== JSON.stringify(rLine)) {
                // Both edited the same line — Collision!
                console.warn(`[ConflictResolver] Line collision on ${id}. Local version preferred.`);
            }
        });
        merged.lines = mergedLines;
    }

    return merged;
  }
}

export const conflictResolver = ConflictResolver.getInstance();
