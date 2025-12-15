/**
 * Unified Inventory Service
 * 
 * Consolidates all inventory-related services into a single namespace.
 * Provides backward compatibility while enabling cleaner imports.
 * 
 * Usage:
 *   import { inventoryService } from '@/services/inventory'
 *   
 *   // Create a document
 *   const doc = await inventoryService.documents.createInventoryDocument({...})
 *   
 *   // List materials
 *   const materials = await inventoryService.materials.listMaterials(orgId)
 *   
 *   // Get reconciliation sessions
 *   const sessions = await inventoryService.reconciliation.ReconciliationService.listSessions()
 */

import * as documentsService from './documents'
import * as materialsService from './materials'
import * as locationsService from './locations'
import * as reconciliationService from './reconciliation'
import * as reportsService from './reports'
import * as uomsService from './uoms'
import * as configService from './config'

/**
 * Unified Inventory Service Class
 * 
 * Organizes all inventory services into logical namespaces:
 * - documents: Document CRUD, posting, approval, voiding
 * - materials: Material master data management
 * - locations: Inventory location management
 * - reconciliation: Physical inventory reconciliation
 * - reports: Inventory reporting (on-hand, valuation, ageing, movements)
 * - uoms: Unit of measure management
 * - config: Configuration (GL mappings, etc.)
 */
class InventoryService {
  /**
   * Document management services
   * Handles inventory documents (receipts, issues, transfers, adjustments, returns)
   */
  public readonly documents = documentsService

  /**
   * Material master data services
   * Manages materials, categories, and material attributes
   */
  public readonly materials = materialsService

  /**
   * Location management services
   * Handles inventory locations, warehouses, and storage areas
   */
  public readonly locations = locationsService

  /**
   * Reconciliation services
   * Physical inventory counting and reconciliation workflows
   */
  public readonly reconciliation = reconciliationService

  /**
   * Reporting services
   * On-hand reports, valuation, ageing, movement summaries
   */
  public readonly reports = reportsService

  /**
   * Unit of measure services
   * Manages UOMs and conversions
   */
  public readonly uoms = uomsService

  /**
   * Configuration services
   * GL mappings and system configuration
   */
  public readonly config = configService
}

/**
 * Singleton instance of InventoryService
 * Use this for all inventory operations
 */
export const inventoryService = new InventoryService()

/**
 * Default export for convenience
 */
export default inventoryService

// ============================================================================
// Type Re-exports
// ============================================================================

// Documents
export type {
  DocStatus,
  DocType,
  InventoryDocumentRow,
  InventoryDocumentLineRow,
  InventoryDocumentSummary,
  InventoryPostingLink,
  LinkedTxForDocument,
} from './documents'

// Materials
export type {
  MaterialRow,
} from './materials'

// Locations
export type {
  InventoryLocationRow,
} from './locations'

// Reconciliation
export type {
  ReconSession,
  ReconLine,
  ReconSummary,
} from './reconciliation'

// Reports
export type {
  MovementDetailRow,
  OnHandRow,
  ValuationRow,
  AgeingRow,
  MovementSummaryRow,
} from './reports'

// UOMs
export type {
  UomRow,
} from './uoms'

// Config
export type {
  MovementType,
  SetGLMappingByCodeParams,
} from './config'

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

/**
 * Legacy exports for backward compatibility
 * Existing code can continue using direct imports
 * 
 * @deprecated Use inventoryService.documents.* instead
 */
export {
  createInventoryDocument,
  addInventoryDocumentLine,
  listInventoryMovements,
  listInventoryOnHandFiltered,
  listInventoryMovementsFiltered,
  listMovementsByDocument,
  approveInventoryDocument,
  postInventoryDocument,
  listDocumentLines,
  postAdjustWithType,
  postReturnWithType,
  listRecentDocuments,
  getInventoryDocument,
  findInventoryDocumentByTransaction,
  listInventoryPostingsByTransaction,
  listTransactionsLinkedToDocuments,
  voidInventoryDocument,
} from './documents'

/**
 * @deprecated Use inventoryService.materials.* instead
 */
export {
  listMaterials,
  createMaterial,
  updateMaterial,
} from './materials'

/**
 * @deprecated Use inventoryService.locations.* instead
 */
export {
  listInventoryLocations,
  createInventoryLocation,
  updateInventoryLocation,
} from './locations'

/**
 * @deprecated Use inventoryService.reconciliation.ReconciliationService.* instead
 */
export {
  ReconciliationService,
} from './reconciliation'

/**
 * @deprecated Use inventoryService.reports.* instead
 */
export {
  InventoryMovementService,
  InventoryReportsService,
} from './reports'

/**
 * @deprecated Use inventoryService.uoms.* instead
 */
export {
  listUOMs,
} from './uoms'

/**
 * @deprecated Use inventoryService.config.* instead
 */
export {
  setGLMappingByCode,
} from './config'
