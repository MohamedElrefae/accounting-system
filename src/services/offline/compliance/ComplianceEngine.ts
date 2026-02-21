/**
 * ComplianceEngine.ts
 * Implements regulatory compliance rules (SOX, GDPR, GAAP) for the offline-first system.
 * 
 * Responsibilities:
 * - SOX: Support server-side verification of audit chains
 * - GDPR: Implement secure data deletion and portability exports
 * - GAAP: Verify accounting rules (double-entry, revenue recognition)
 * - SOC 2: Log all access to sensitive financial data
 */

import { secureWipe } from '../security/OfflineEncryption';
import { exportAuditTrail, verifyLocalAuditChain } from '../security/AuditLogger';
import { AccountingValidator } from '../core/AccountingValidator';
import type { Transaction } from '../core/OfflineTypes';

export class ComplianceEngine {
    private static instance: ComplianceEngine;

    private constructor() {}

    public static getInstance(): ComplianceEngine {
        if (!ComplianceEngine.instance) {
            ComplianceEngine.instance = new ComplianceEngine();
        }
        return ComplianceEngine.instance;
    }

    /**
     * Requirement 10.1: SOX Compliance.
     * Prepares and validates the audit trail for regulatory reporting.
     */
    public async validateSoxCompliance(): Promise<{ isValid: boolean; report: any }> {
        const chainResult = await verifyLocalAuditChain();
        const auditExport = await exportAuditTrail();
        
        return {
            isValid: chainResult.valid,
            report: {
                chainValid: chainResult.valid,
                entryCount: auditExport.entries.length,
                deviceId: auditExport.deviceId,
                timestamp: auditExport.exportedAt
            }
        };
    }

    /**
     * Requirement 10.2: GDPR Compliance.
     * Implements "Right to be Forgotten" and "Data Portability".
     */
    public async handleGdprRequest(type: 'delete_all' | 'export_all'): Promise<any> {
        if (type === 'delete_all') {
            console.info('[GDPR] Executing secure wipe for Right to be Forgotten request.');
            await secureWipe();
            return { success: true, message: 'All personal and financial data cleared locally.' };
        } else {
            console.info('[GDPR] Preparing data portability export.');
            return await exportAuditTrail();
        }
    }

    /**
     * Requirement 10.4: GAAP Compliance.
     * Runs automated checks against standard accounting principles.
     */
    public async verifyGaapCompliance(transactions: Transaction[]): Promise<{ passes: boolean; failures: string[] }> {
        const failures: string[] = [];

        for (const tx of transactions) {
            try {
                await AccountingValidator.validateTransaction(tx);
            } catch (err: any) {
                failures.push(`Transaction ${tx.referenceNumber}: ${err.message}`);
            }
        }

        return {
            passes: failures.length === 0,
            failures
        };
    }

    /**
     * SOC 2 / ISO 27001: Access Monitoring.
     * Logs access to restricted financial data.
     */
    public async logRestrictedDataAccess(userId: string, dataId: string, reason: string): Promise<void> {
        // This would call a dedicated security event logger
        console.info(`[Compliance] User ${userId} accessed restricted record ${dataId}. Reason: ${reason}`);
    }
}

export const complianceEngine = ComplianceEngine.getInstance();
