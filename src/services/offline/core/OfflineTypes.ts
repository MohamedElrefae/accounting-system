/**
 * OfflineTypes.ts
 * Central type definitions for the offline-first accounting system.
 * All interfaces used across the offline service layer are defined here.
 */

// ─── Sync Status ─────────────────────────────────────────────────────────────

/**
 * Lifecycle of a transaction in the offline-first system.
 * CRITICAL: Transactions must pass through 'pending_verification' before posting.
 */
export type TransactionSyncStatus =
  | 'local_draft'           // Created offline, not yet validated
  | 'pending_verification'  // Synced to server, awaiting accounting validation
  | 'verified'              // Passed double-entry and business rule checks
  | 'posted'                // Committed to ledger — immutable
  | 'conflict'              // Sync conflict requiring manual resolution
  | 'rejected';             // Failed server-side validation

export type QueueStatus =
  | 'pending'
  | 'processing'
  | 'synced'
  | 'failed'
  | 'conflict';

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

// ─── Vector Clock ─────────────────────────────────────────────────────────────

/** Logical clock for distributed conflict detection */
export interface VectorClock {
  [nodeId: string]: number;
}

// ─── Core Financial Models ────────────────────────────────────────────────────

export interface TransactionLine {
  id: string;
  transaction_id: string;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  dimensions?: Record<string, string>;
  line_status?: string;

  // Offline-specific
  localId?: string;
  syncStatus: TransactionSyncStatus;
  vectorClock: VectorClock;
  checksum?: string;
}

export interface Transaction {
  id: string;
  entry_number: string;
  reference_number?: string;
  entry_date: string;           // ISO date string
  description: string;
  amount?: number;
  approval_status: 'draft' | 'submitted' | 'approved' | 'posted' | 'rejected' | 'pending';
  fiscal_period_id?: string;
  org_id: string;
  project_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;

  // Offline-specific fields
  localId?: string;
  syncStatus: TransactionSyncStatus;
  vectorClock: VectorClock;
  conflictVersion?: number;
  checksum?: string;           // SHA-256 of payload for integrity
  offlineCreatedAt?: string;   // When created offline
  lastSyncedAt?: string;

  // Relationships
  lines?: TransactionLine[];
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: 'transaction' | 'transaction_line' | 'attachment' | 'payment';
  entityId: string;
  localId?: string;
  data: Record<string, unknown>;
  timestamp: string;
  userId: string;
  deviceId: string;
  vectorClock: VectorClock;
  dependencies: string[];
  checksum: string;
}

export interface SyncQueueEntry {
  id: string;
  operation: SyncOperation;
  priority: number;           // Higher = more urgent
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  status: QueueStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  conflicts: DataConflict[];
  errors: SyncError[];
  duration: number;
  canResume?: boolean;
  resumeFrom?: number;
}

export interface SyncError {
  operationId: string;
  code: string;
  message: string;
  retryable: boolean;
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

export type ConflictType =
  | 'sequence_conflict'
  | 'amount_discrepancy'
  | 'fiscal_period_closed'
  | 'concurrent_edit'
  | 'semantic_duplicate'
  | 'account_code_changed'
  | 'referential_integrity';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ResolutionStrategy =
  | 'sequence-rebase'
  | 'amount-reconciliation'
  | 'block-and-notify'
  | 'draft-mode'
  | 'last-write-wins'
  | 'server-wins'
  | 'merge'
  | 'manual';

export interface FieldConflict {
  fieldName: string;
  localValue: unknown;
  remoteValue: unknown;
  dataType: string;
  conflictReason: string;
}

export interface DataConflict {
  id: string;
  type: ConflictType;
  localOperation: SyncOperation;
  remoteOperation: SyncOperation;
  fieldConflicts: FieldConflict[];
  severity: ConflictSeverity;
  autoResolvable: boolean;
  matchScore?: number;        // For semantic duplicates (0-1)
  matchReasons?: string[];    // e.g. "same supplier, amount within 5%"
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedData: Record<string, unknown>;
  resolvedBy: string;
  resolvedAt: string;
  auditTrail: AuditEntry[];
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  operationId: string;
  userId: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'conflict_resolved' | 'rejected';
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  deviceInfo: {
    deviceId: string;
    browser: string;
    platform: string;
  };
  offlineMode: boolean;
  syncedAt?: string;
  // Blockchain-style linking
  previousHash: string;
  currentHash: string;
  immutable: true;
}

// ─── Storage Management ───────────────────────────────────────────────────────

export type AttachmentMode = 'thumbnail-only' | 'full' | 'cloud-reference';

export interface StorageInfo {
  totalCapacity: number;
  usedSpace: number;
  availableSpace: number;
  quotaPercentUsed: number;
  isPersisted: boolean;
  dataBreakdown: {
    transactions: number;
    attachments: number;
    cache: number;
    indexes: number;
    syncQueue: number;
    auditLog: number;
  };
  attachmentMode: AttachmentMode;
  isMobileCapped: boolean;
  mobileCap: number;
}

export interface StorageRecommendation {
  type: 'archive' | 'cleanup' | 'compress' | 'warn';
  message: string;
  potentialSavings: number;
  action?: () => Promise<void>;
}

// ─── Security ─────────────────────────────────────────────────────────────────

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface EncryptedData {
  encryptedContent: string;   // Base64 encoded
  algorithm: 'AES-256-GCM';
  keyId: string;
  iv: string;                 // Base64 encoded
  authTag: string;            // Base64 encoded
  classification: DataClassification;
  encryptedAt: string;
}

export interface SecurityEvent {
  id: string;
  type: 'auth_failure' | 'wrong_pin' | 'auto_lock' | 'secure_wipe' | 'access_violation' | 'integrity_failure' | 'DATA_CORRUPTION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  userId: string;
  deviceId: string;
  details: Record<string, unknown>;
  resolved: boolean;
}

// ─── Offline Lock (Multi-User Collaboration) ──────────────────────────────────

export interface OfflineLock {
  id: string;
  resourceId: string;
  resourceType: string;
  userId: string;
  userName: string;
  acquiredAt: string;
  expiresAt: string;
  syncStatus: 'pending' | 'syncing';
  lastKnownValue?: Record<string, unknown>;
}

// ─── Sync Checkpoint (for resumable sync) ────────────────────────────────────

export interface SyncCheckpoint {
  id: string;
  timestamp: string;
  lastSyncedOperationIndex: number;
  totalOperations: number;
  syncedOperationIds: string[];
  pendingOperationIds: string[];
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface SystemHealthCheck {
  timestamp: string;
  indexedDBStatus: 'healthy' | 'corrupted' | 'unreachable';
  lastSuccessfulSync?: string;
  pendingOperations: number;
  storageQuotaUsed: number;
  storageQuotaAvailable: number;
  quotaPercentUsed: number;
  hasUnresolvedConflicts: boolean;
  oldestPendingOperation?: string;
}

// ─── Recovery ────────────────────────────────────────────────────────────────

export interface RecoveryMetrics {
  recoveryId: string;
  recoveryType: 'corruption' | 'partial_sync' | 'data_loss' | 'bulk_rejection';
  startTime: string;
  endTime: string;
  operationsAffected: number;
  operationsRecovered: number;
  operationsLost: number;
  recoverySource: 'server' | 'local_backup' | 'manual';
  userImpact: 'none' | 'minor' | 'major' | 'critical';
  browserInfo: string;
  errorDetails: string;
}

// ─── Platform Config ──────────────────────────────────────────────────────────

export interface PlatformSyncConfig {
  isMobile: boolean;
  periodicSyncInterval: number;   // ms
  maxConcurrentOperations: number;
  retryAttempts: number;
  batteryThreshold: number;       // 0-1, 0 means no check
  preferWiFi?: boolean;
  mobileCap?: number;             // bytes, 200MB default on mobile
}
